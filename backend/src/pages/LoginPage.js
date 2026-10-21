import { icon, esc } from './shared.js';

export function LoginPage() {
  return `
    <div class="min-h-screen bg-surface text-on-surface font-body-md flex items-center justify-center p-4">
      <main class="w-full max-w-lg mx-auto bg-surface-container rounded-xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-6">
        
        <!-- Header -->
        <div class="flex flex-col gap-1 text-center">
          <div class="flex items-center justify-center gap-2 text-primary-container">
            ${icon('precision_manufacturing', 'text-[32px] text-primary-container')}
            <span class="font-headline-lg text-2xl font-bold tracking-wider text-on-surface">ROBOTHON ARENA</span>
          </div>
          <p class="text-sm text-on-surface-variant font-mono">
            Competition Quiz System &amp; Telemetry Gateway
          </p>
        </div>

        <!-- Mode Selector Tabs -->
        <div class="grid grid-cols-2 bg-surface-container-lowest p-1 rounded gap-1 border border-outline-variant/20">
          <button type="button" id="tab-participant" class="flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all bg-surface-container text-primary-container shadow-sm border border-primary-container/30">
            ${icon('group', 'text-[18px]')}
            <span>Team Login</span>
          </button>
          <button type="button" id="tab-admin" class="flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all text-on-surface-variant hover:text-on-surface">
            ${icon('admin_panel_settings', 'text-[18px]')}
            <span>Organizer / Super Admin</span>
          </button>
        </div>

        <!-- OC PIN Security Gate (Shown before Organizer Login unlocks) -->
        <div id="oc-pin-gate" class="hidden bg-surface-container-low rounded-lg p-6 border border-secondary/40 flex flex-col gap-5 shadow-lg">
          <div class="flex items-center gap-3 pb-3 border-b border-outline-variant/20">
            <div class="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
              ${icon('shield', 'text-[22px]')}
            </div>
            <div class="flex flex-col">
              <h2 class="font-mono text-sm font-bold uppercase text-on-surface tracking-wider">
                OC Security Clearance Required
              </h2>
              <span class="text-xs text-on-surface-variant font-mono">
                Organizer &amp; Super Admin controls are restricted.
              </span>
            </div>
          </div>

          <form id="oc-pin-form" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold text-on-surface uppercase tracking-wider" for="oc-pin-input">
                Enter 4-Digit OC PIN
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3 text-outline pointer-events-none">${icon('key', 'text-[18px]')}</span>
                <input id="oc-pin-input" name="ocPin" type="password" maxlength="8" required autocomplete="off"
                       class="w-full bg-surface-container-lowest text-on-surface font-mono text-base tracking-widest pl-10 pr-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors" />
              </div>
            </div>

            <div id="oc-pin-error" class="min-h-5 text-error text-xs font-mono font-bold"></div>

            <div class="grid grid-cols-2 gap-3 pt-1">
              <button type="button" id="btn-cancel-oc-pin"
                      class="w-full bg-surface-container text-on-surface-variant hover:text-on-surface transition-all py-2.5 px-4 rounded font-mono text-xs font-bold uppercase tracking-wider border border-outline-variant/30">
                Cancel
              </button>
              <button type="submit" id="btn-verify-oc-pin"
                      class="w-full bg-secondary text-on-secondary hover:brightness-110 transition-all py-2.5 px-4 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(255,179,0,0.3)]">
                ${icon('lock_open', 'text-[16px]')}
                <span>Unlock Console</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Main Form Card -->
        <div id="login-form-container" class="bg-surface-container-low rounded-lg p-5 flex flex-col gap-4 border border-outline-variant/30 shadow-md">
          <div id="login-form-heading" class="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <span id="active-mode-label" class="font-mono text-xs uppercase font-bold text-primary">Team Login Portal (Contestants Only)</span>
            <span id="oc-badge" class="hidden text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-secondary/20 text-secondary border border-secondary/30">OC CLEARED</span>
          </div>

          <form id="login-form" class="flex flex-col gap-4">
            <input type="hidden" id="login-portal-mode" name="portalMode" value="TEAM" />
            
            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold text-on-surface uppercase tracking-wider" for="email-input">
                User Email / Identifier
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3 text-outline pointer-events-none">${icon('badge', 'text-[18px]')}</span>
                <input id="email-input" name="email" type="email" required autocomplete="off"
                       class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm pl-10 pr-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors" />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="block text-xs font-mono font-bold text-on-surface uppercase tracking-wider" for="password-input">
                Access Passcode
              </label>
              <div class="relative flex items-center">
                <span class="absolute left-3 text-outline pointer-events-none">${icon('lock', 'text-[18px]')}</span>
                <input id="password-input" name="password" type="password" required autocomplete="off"
                       class="w-full bg-surface-container-lowest text-on-surface font-mono text-sm pl-10 pr-3 py-2 rounded outline-none border border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors" />
              </div>
            </div>

            <div id="login-error" class="min-h-5 text-error text-xs font-mono font-semibold"></div>

            <button type="submit" id="submit-auth-btn" class="w-full bg-primary-container text-on-primary-fixed hover:bg-primary-fixed-dim transition-all py-2.5 px-4 rounded font-mono text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
              <span>Sign In &amp; Launch</span>
              ${icon('arrow_forward', 'text-[18px]')}
            </button>
          </form>
        </div>

      </main>
    </div>
  `;
}
