import { parseInventoryExcel } from './inventory-parser.js';
import { QuizError } from './quiz-service.js';

export function slugify(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class InventoryService {
  constructor(store, { publish = () => {}, clock = Date.now } = {}) {
    this.store = store;
    this.publish = publish;
    this.clock = clock;
    this.ensureState();
  }

  ensureState() {
    this.store.state.inventory ??= {
      items: [],
      allocations: [],
      adjustments: [],
      importHistory: []
    };
    this.store.state.inventory.items ??= [];
    this.store.state.inventory.allocations ??= [];
    this.store.state.inventory.adjustments ??= [];
    this.store.state.inventory.importHistory ??= [];
  }

  adminOrThrow(context) {
    if (!context || !context.authenticated) {
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (!['ADMIN', 'SUPER_ADMIN'].includes(context.role)) {
      throw new QuizError(403, 'FORBIDDEN', 'Administrative clearance required for inventory operations.');
    }
  }

  isTeamDisqualified(teamId) {
    if (!teamId) return false;
    const attempts = (this.store.state.attempts || []).filter(a => a.teamId === teamId);
    if (attempts.some(a => a.debarred || a.qualificationStatus === 'DEBARRED')) return true;
    const platformTeams = this.store.state.platform?.teams || [];
    const teamList = Array.isArray(platformTeams) ? platformTeams : Object.values(platformTeams || {});
    const team = teamList.find(t => t.id === teamId || t.teamId === teamId);
    if (team && Boolean(team.disqualified || team.isDisqualified || team.debarred || team.status === 'DISQUALIFIED' || team.qualificationStatus === 'DEBARRED' || team.qualificationStatus === 'DISQUALIFIED')) {
      return true;
    }
    const disqSet = this.store.state.disqualifiedTeams || [];
    if (disqSet.includes(teamId)) return true;
    return false;
  }

  emit(type, payload) {
    this.publish(type, payload);
  }

  getInventory(context) {
    this.adminOrThrow(context);
    this.ensureState();
    const inv = this.store.state.inventory;

    const totalItems = inv.items.length;
    let totalUnits = 0;
    let availableUnits = 0;
    let allocatedUnits = 0;
    let distributedItems = 0;

    inv.items.forEach(item => {
      totalUnits += (item.totalQuantity || 0);
      availableUnits += (item.availableQuantity || 0);
      allocatedUnits += (item.allocatedQuantity || 0);
      if (item.isDistributed) distributedItems++;
    });

    return {
      summary: {
        totalItems,
        totalUnits,
        availableUnits,
        allocatedUnits,
        distributedItems
      },
      items: inv.items,
      allocations: inv.allocations.slice(-200).reverse(),
      adjustments: inv.adjustments.slice(-200).reverse(),
      importHistory: inv.importHistory.slice(-50).reverse()
    };
  }

  importInventory(context, payload = {}) {
    if (!context || !context.authenticated) {
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (context.role !== 'SUPER_ADMIN') {
      throw new QuizError(403, 'FORBIDDEN', 'Super Admin clearance required to import inventory.');
    }
    this.ensureState();
    const inv = this.store.state.inventory;

    let parsedItems = [];
    let parseErrors = [];
    let skippedCount = 0;
    let sourceFileName = payload.fileName || 'Inventory.xlsx';

    if (payload.fileBase64) {
      const parsed = parseInventoryExcel(payload.fileBase64);
      parsedItems = parsed.items || [];
      parseErrors = parsed.errors || [];
      skippedCount = parsed.skipped || 0;
    } else if (Array.isArray(payload.items)) {
      parsedItems = payload.items;
    } else {
      throw new QuizError(422, 'INVALID_PAYLOAD', 'Please provide an Excel file or an array of inventory items.');
    }

    if (parsedItems.length === 0 && parseErrors.length === 0) {
      throw new QuizError(422, 'EMPTY_FILE', 'No inventory rows found in the uploaded file.');
    }

    let importedCount = 0;
    let updatedCount = 0;
    const details = [];

    // Process parsed items
    for (const raw of parsedItems) {
      const name = String(raw.name || '').trim();
      if (!name) continue;

      const qty = parseInt(raw.quantity ?? raw.totalQuantity, 10);
      if (isNaN(qty) || qty < 0) {
        parseErrors.push({ item: name, reason: 'Invalid quantity: ' + (raw.quantity ?? raw.totalQuantity) });
        continue;
      }

      const isDistributed = raw.isDistributed !== false;
      const category = (raw.category && String(raw.category).trim()) || 'General';
      const slug = slugify(name);
      const itemId = raw.id || ('inv-' + slug);

      // Check if existing item exists by ID, slug or exact name
      const existing = inv.items.find(i => i.id === itemId || i.id === ('inv-' + slug) || slugify(i.name) === slug || i.name.toLowerCase() === name.toLowerCase());

      if (existing) {
        // Calculate currently allocated quantity across all past allocations
        const currentAllocated = existing.allocatedQuantity || 0;
        // Ensure new master quantity cannot drop below what has already been physically allocated
        if (qty < currentAllocated) {
          parseErrors.push({
            item: name,
            reason: `Uploaded quantity (${qty}) is less than already allocated quantity (${currentAllocated}). Stock update rejected.`
          });
          continue;
        }

        existing.totalQuantity = qty;
        existing.availableQuantity = qty - currentAllocated;
        existing.isDistributed = isDistributed;
        if (category && category !== 'General') existing.category = category;
        existing.updatedAt = new Date().toISOString();
        updatedCount++;
        details.push({ action: 'UPDATED', name, total: qty, available: existing.availableQuantity });
      } else {
        const newItem = {
          id: itemId,
          name,
          category,
          totalQuantity: qty,
          availableQuantity: qty,
          allocatedQuantity: 0,
          isDistributed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        inv.items.push(newItem);
        importedCount++;
        details.push({ action: 'IMPORTED', name, total: qty, available: qty });
      }
    }

    const summary = {
      totalRows: parsedItems.length + skippedCount + parseErrors.length,
      importedCount,
      updatedCount,
      skippedCount,
      errorsCount: parseErrors.length,
      errors: parseErrors,
      details
    };

    // Save record to import history
    inv.importHistory.push({
      id: 'import-' + Date.now(),
      fileName: sourceFileName,
      importedBy: context.email || context.userId,
      adminName: context.name || 'Admin',
      importedAt: new Date().toISOString(),
      summary
    });

    this.store.save();
    this.emit('INVENTORY_UPDATED', { type: 'IMPORT', summary });

    return {
      success: true,
      summary,
      itemsCount: inv.items.length
    };
  }

  allocate(context, { teamId, inventoryItemId, quantity, notes }) {
    this.adminOrThrow(context);
    this.ensureState();
    const inv = this.store.state.inventory;

    if (!teamId) throw new QuizError(422, 'TEAM_REQUIRED', 'Please select a team.');
    if (!inventoryItemId) throw new QuizError(422, 'ITEM_REQUIRED', 'Please select an inventory item.');

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new QuizError(400, 'INVALID_QUANTITY', 'Allocation quantity must be a positive number.');
    }

    const item = inv.items.find(i => i.id === inventoryItemId);
    if (!item) {
      throw new QuizError(404, 'ITEM_NOT_FOUND', 'Inventory item was not found.');
    }

    if (qty > item.availableQuantity) {
      throw new QuizError(400, 'INSUFFICIENT_INVENTORY', `Insufficient inventory. Only ${item.availableQuantity} units are currently available.`);
    }

    if (item.isDistributed === false) {
      throw new QuizError(400, 'NOT_FOR_DISTRIBUTION', `"${item.name}" is marked as Not For Distribution (To Distribute: NO) and cannot be allocated to teams.`);
    }

    if (this.isTeamDisqualified(teamId)) {
      throw new QuizError(400, 'TEAM_DISQUALIFIED', 'Cannot allocate physical components to a disqualified team.');
    }

    // Lookup team name
    const platformTeams = this.store.state.platform?.teams || [];
    const matchedTeam = platformTeams.find(t => t.id === teamId || t.teamId === teamId);
    const teamName = matchedTeam?.name || matchedTeam?.teamName || teamId;

    // Transactional decrement
    item.availableQuantity -= qty;
    item.allocatedQuantity = (item.allocatedQuantity || 0) + qty;
    item.updatedAt = new Date().toISOString();

    const allocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      teamId,
      teamName,
      inventoryItemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      quantity: qty,
      notes: notes?.trim() || null,
      allocatedBy: context.email || context.userId,
      adminName: context.name || 'Admin',
      allocatedAt: new Date().toISOString()
    };

    inv.allocations.push(allocation);
    this.store.save();
    this.emit('INVENTORY_UPDATED', { type: 'ALLOCATE', allocation, item });

    return {
      success: true,
      allocation,
      item
    };
  }

  adjust(context, { teamId, inventoryItemId, delta, reason }) {
    this.adminOrThrow(context);
    this.ensureState();
    const inv = this.store.state.inventory;

    if (!teamId) throw new QuizError(422, 'TEAM_REQUIRED', 'Please select a team.');
    if (!inventoryItemId) throw new QuizError(422, 'ITEM_REQUIRED', 'Please select an inventory item.');
    if (!reason || !reason.trim()) {
      throw new QuizError(400, 'REASON_REQUIRED', 'A reason is required to perform an inventory correction.');
    }

    const d = parseInt(delta, 10);
    if (isNaN(d) || d === 0) {
      throw new QuizError(400, 'INVALID_DELTA', 'Adjustment delta must be a non-zero integer.');
    }

    const item = inv.items.find(i => i.id === inventoryItemId);
    if (!item) {
      throw new QuizError(404, 'ITEM_NOT_FOUND', 'Inventory item was not found.');
    }

    // Calculate current net allocated quantity for this team & item
    const teamAllocations = inv.allocations.filter(a => a.teamId === teamId && a.inventoryItemId === inventoryItemId);
    const currentAllocated = teamAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);

    if (d < 0 && currentAllocated + d < 0) {
      throw new QuizError(400, 'INVALID_ADJUSTMENT', `Cannot reduce allocation by ${Math.abs(d)}. Team currently only has ${currentAllocated} units allocated.`);
    }

    if (d > 0 && this.isTeamDisqualified(teamId)) {
      throw new QuizError(400, 'TEAM_DISQUALIFIED', 'Cannot allocate physical components to a disqualified team.');
    }

    if (d > 0 && item.isDistributed === false) {
      throw new QuizError(400, 'NOT_FOR_DISTRIBUTION', `"${item.name}" is marked as Not For Distribution (To Distribute: NO) and cannot be allocated to teams.`);
    }

    if (d > 0 && d > item.availableQuantity) {
      throw new QuizError(400, 'INSUFFICIENT_INVENTORY', `Insufficient inventory. Only ${item.availableQuantity} units are currently available.`);
    }

    // Lookup team name
    const platformTeams = this.store.state.platform?.teams || [];
    const matchedTeam = platformTeams.find(t => t.id === teamId || t.teamId === teamId);
    const teamName = matchedTeam?.name || matchedTeam?.teamName || teamAllocations[0]?.teamName || teamId;

    // Transactional adjustment
    item.availableQuantity -= d;
    item.allocatedQuantity = Math.max(0, (item.allocatedQuantity || 0) + d);
    item.updatedAt = new Date().toISOString();

    const adjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      teamId,
      teamName,
      inventoryItemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      previousQuantity: currentAllocated,
      adjustedDelta: d,
      newQuantity: currentAllocated + d,
      reason: reason.trim(),
      adjustedBy: context.email || context.userId,
      adminName: context.name || 'Admin',
      adjustedAt: new Date().toISOString()
    };

    inv.adjustments.push(adjustment);

    // Also record a ledger entry in allocations so history remains continuous
    inv.allocations.push({
      id: `alloc-adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      teamId,
      teamName,
      inventoryItemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      quantity: d,
      notes: `Correction: ${reason.trim()}`,
      allocatedBy: context.email || context.userId,
      adminName: context.name || 'Admin',
      allocatedAt: new Date().toISOString(),
      isAdjustment: true
    });

    this.store.save();
    this.emit('INVENTORY_UPDATED', { type: 'ADJUST', adjustment, item });

    return {
      success: true,
      adjustment,
      item
    };
  }

  resetAllocations(context) {
    if (!context || !context.authenticated) {
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (context.role !== 'SUPER_ADMIN') {
      throw new QuizError(403, 'FORBIDDEN', 'Super Admin clearance required to reset allocations.');
    }
    this.ensureState();
    const inv = this.store.state.inventory;

    // Reset allocated quantities for all items and restore available quantity to total
    inv.items.forEach(item => {
      item.allocatedQuantity = 0;
      item.availableQuantity = item.totalQuantity;
      item.updatedAt = new Date().toISOString();
    });

    // Remove any test items like 'inv-test-motor-900rpm'
    inv.items = inv.items.filter(i => !i.id.includes('test-motor') && !i.name.toLowerCase().includes('test motor'));

    const clearedAllocationsCount = (inv.allocations || []).length;
    const clearedAdjustmentsCount = (inv.adjustments || []).length;
    inv.allocations = [];
    inv.adjustments = [];

    this.store.save();
    this.emit('INVENTORY_UPDATED', { type: 'RESET_ALLOCATIONS', clearedAllocationsCount, clearedAdjustmentsCount });

    return {
      success: true,
      message: `Reset complete. Cleared ${clearedAllocationsCount} distribution records and ${clearedAdjustmentsCount} corrections. All stock returned to available.`,
      clearedAllocationsCount,
      clearedAdjustmentsCount
    };
  }

  clearAllInventory(context) {
    if (!context || !context.authenticated) {
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    if (context.role !== 'SUPER_ADMIN') {
      throw new QuizError(403, 'FORBIDDEN', 'Super Admin clearance required to clear inventory.');
    }
    this.ensureState();
    const inv = this.store.state.inventory;

    const removedCount = (inv.items || []).length;
    inv.items = [];
    inv.allocations = [];
    inv.adjustments = [];
    inv.importHistory = [];

    this.store.save();
    this.emit('INVENTORY_UPDATED', { type: 'CLEAR_ALL', removedCount });

    return {
      success: true,
      message: `All inventory components, allocations, and history have been completely removed (${removedCount} items wiped).`,
      removedCount
    };
  }

  getTeamInventory(context, requestedTeamId) {
    if (!context || !context.authenticated) {
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to view team inventory.');
    }
    this.ensureState();
    const inv = this.store.state.inventory;

    // Strict security: Team leaders can ONLY view their own team's inventory
    let effectiveTeamId;
    if (['TEAM_LEADER', 'TEAM_MEMBER'].includes(context.role)) {
      effectiveTeamId = context.teamId;
      if (!effectiveTeamId) {
        throw new QuizError(403, 'NO_TEAM', 'No team is associated with your account.');
      }
    } else {
      // Admins can query any team
      effectiveTeamId = requestedTeamId || context.teamId;
    }

    if (!effectiveTeamId) {
      return { teamId: null, teamName: null, items: [], totalUnits: 0, history: [] };
    }

    // Lookup team name
    const platformTeams = this.store.state.platform?.teams || [];
    const matchedTeam = platformTeams.find(t => t.id === effectiveTeamId || t.teamId === effectiveTeamId);
    const teamName = matchedTeam?.name || matchedTeam?.teamName || effectiveTeamId;

    // Filter allocations for this team
    const teamAllocations = inv.allocations.filter(a => a.teamId === effectiveTeamId);

    // Group allocations by item
    const itemsMap = new Map();
    for (const alloc of teamAllocations) {
      if (!itemsMap.has(alloc.inventoryItemId)) {
        const masterItem = inv.items.find(i => i.id === alloc.inventoryItemId);
        itemsMap.set(alloc.inventoryItemId, {
          inventoryItemId: alloc.inventoryItemId,
          name: alloc.itemName || masterItem?.name || 'Unknown Part',
          category: alloc.itemCategory || masterItem?.category || 'General',
          totalQuantity: 0,
          isDistributed: masterItem ? masterItem.isDistributed : true,
          allocations: []
        });
      }
      const entry = itemsMap.get(alloc.inventoryItemId);
      entry.totalQuantity += (alloc.quantity || 0);
      entry.allocations.push({
        id: alloc.id,
        quantity: alloc.quantity,
        allocatedAt: alloc.allocatedAt,
        adminName: alloc.adminName,
        notes: alloc.notes,
        isAdjustment: Boolean(alloc.isAdjustment)
      });
    }

    // Only return items where net allocated quantity > 0
    const activeItems = Array.from(itemsMap.values()).filter(item => item.totalQuantity > 0);
    const totalUnits = activeItems.reduce((sum, item) => sum + item.totalQuantity, 0);

    return {
      teamId: effectiveTeamId,
      teamName,
      items: activeItems,
      totalUnits,
      history: teamAllocations.slice(-50).reverse()
    };
  }

  getCategoryPriority(context, quizId = 'quiz-2') {
    // Both admins and team leaders can view priority once available
    const questions = this.store.getQuestions(quizId);
    const attempts = this.store.state.attempts.filter(a => a.quizId === quizId);
    const answers = this.store.state.answers.filter(a => a.quizId === quizId || questions.some(q => q.id === a.questionId));

    // Discover categories in questions (fallback to inferred category if missing)
    const categoryMap = new Map();
    questions.forEach(q => {
      let cat = q.category && q.category.trim();
      if (!cat || cat === 'General') {
        const lower = q.questionText.toLowerCase();
        if (/motor|rpm/i.test(lower)) cat = 'Motors';
        else if (/gear|ratio|pulley/i.test(lower)) cat = 'Gearing';
        else if (/wheel|tire|slippage/i.test(lower)) cat = 'Wheels';
        else if (/sensor|ultrasonic|imu|encoder/i.test(lower)) cat = 'Sensors';
        else if (/battery|lipo|power|voltage|current/i.test(lower)) cat = 'Power';
        else if (/wire|driver|esp32|i2c|spi|bus|diode/i.test(lower)) cat = 'Electronics';
        else cat = 'General';
      }
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push(q);
    });

    const categories = Array.from(categoryMap.keys());
    const priorityByCategory = {};

    for (const [catName, catQuestions] of categoryMap.entries()) {
      const catQIds = new Set(catQuestions.map(q => q.id));
      const teamStats = [];

      for (const attempt of attempts) {
        if (attempt.debarred) continue;
        const teamAnswers = answers.filter(a => a.attemptId === attempt.id && catQIds.has(a.questionId));
        const categoryScore = teamAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
        const correctCount = teamAnswers.filter(a => a.isCorrect).length;

        teamStats.push({
          teamId: attempt.teamId,
          teamName: attempt.teamName || attempt.teamId,
          category: catName,
          categoryScore,
          correctCount,
          totalQuestions: catQuestions.length,
          timeTaken: attempt.timeTakenSeconds ?? 0,
          submittedAt: attempt.submittedAt || attempt.startedAt || 0
        });
      }

      // Sort category ranking: (1) higher score, (2) faster timeTaken, (3) earlier submittedAt
      teamStats.sort((a, b) => {
        if (b.categoryScore !== a.categoryScore) return b.categoryScore - a.categoryScore;
        if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
        return Date.parse(a.submittedAt) - Date.parse(b.submittedAt);
      });

      let rank = 1;
      priorityByCategory[catName] = teamStats.map(stat => ({
        rank: rank++,
        ...stat
      }));
    }

    return {
      quizId,
      categories,
      priorityByCategory
    };
  }
}
