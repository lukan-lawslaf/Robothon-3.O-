export type SubsystemKey = 'chassis' | 'wheels' | 'motors' | 'l298n' | 'battery' | 'esp32' | 'wires';

export interface SubsystemInfo {
  name: string;
  code: string;
  category: string;
  color: string;
  desc: string;
  specs: string;
}

export const SUBSYSTEMS_DATA: Record<SubsystemKey, SubsystemInfo> = {
  motors: {
    name: 'Motor Mounting & Connection',
    code: 'CP 01',
    category: 'Powertrain',
    color: '#ea580c',
    desc: '12V 300 RPM GA25 metal geared DC motors with planetary gearboxes and precision brass hex couplers.',
    specs: '12V DC | 300 RPM | 15 kg.cm Torque | 4mm D-cut Hex',
  },
  l298n: {
    name: 'L298N Motor Driver Setup',
    code: 'CP 02',
    category: 'Electronics',
    color: '#ea580c',
    desc: 'Dual H-Bridge motor driver with multi-fin black anodized heatsink and screw terminal block headers.',
    specs: 'Peak: 2A/channel | Logic: 5V TTL | Heat: Aluminum Fin',
  },
  wires: {
    name: 'ESP32 Logic Wiring',
    code: 'CP 03',
    category: 'Wiring',
    color: '#ea580c',
    desc: 'Color-coded Dupont logic ribbon jumpers, thick 14AWG silicone 12V power leads, and rubber anti-chafe grommets.',
    specs: 'Logic: 28AWG Dupont | Power: 14AWG Silicone | Common Ground Rail',
  },
  esp32: {
    name: 'Firmware & Wi-Fi / BLE',
    code: 'CP 04 / 06',
    category: 'Telemetry',
    color: '#ea580c',
    desc: 'ESP32-WROOM-32 Wi-Fi / BLE microcontroller with metal RF shield, USB-UART bridge, and 30-pin GPIO.',
    specs: 'Dual Tensilica 240MHz | 802.11 b/g/n + BLE 4.2 | 30-pin GPIO',
  },
  battery: {
    name: '3S Battery Power Integration',
    code: 'CP 05',
    category: 'Power',
    color: '#ea580c',
    desc: '11.1V 3S Li-Ion 2200mAh pack with authentic XT60 high-current gold pins and JST-XH balance lead.',
    specs: '3S1P 18650 | 2200mAh (24.4Wh) | XT60 Fused Connector',
  },
  chassis: {
    name: 'Polarity & Chassis Maiden Run',
    code: 'CP 07',
    category: 'Structural',
    color: '#ea580c',
    desc: 'Bent aluminum U-channel chassis plate with front bullbar, side motor mount flanges, and aero top deck.',
    specs: '6061-T6 Alum + ABS Deck | 140x220mm | M3 Hex Socket',
  },
  wheels: {
    name: 'Competition Wheels (x4)',
    code: 'Propulsion',
    category: 'Propulsion',
    color: '#f97316',
    desc: 'Deep-dish competition white rims with 6 cutout spokes, beadlock rivets, and 20-lug chevron rubber tires.',
    specs: 'Dia: 65mm | Aggressive 20-Lug Chevron | 12mm Hex Hub',
  },
};
