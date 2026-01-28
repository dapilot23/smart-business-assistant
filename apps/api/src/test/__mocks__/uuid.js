// Manual mock for uuid v13 (ESM-only) to work with Jest (CJS)
module.exports = {
  v4: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10),
  v1: () => 'test-uuid-v1',
  v3: () => 'test-uuid-v3',
  v5: () => 'test-uuid-v5',
  v6: () => 'test-uuid-v6',
  v7: () => 'test-uuid-v7',
  NIL: '00000000-0000-0000-0000-000000000000',
  MAX: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  validate: () => true,
  parse: () => new Uint8Array(16),
  stringify: () => '00000000-0000-0000-0000-000000000000',
  version: () => 4,
};
