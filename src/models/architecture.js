export const createGlobalModel = (overrides = {}) => ({
  identity: overrides.identity ?? null,
  patient: overrides.patient ?? null,
  billing: overrides.billing ?? null,
  audit: overrides.audit ?? null,
  permissions: overrides.permissions ?? null,
  reporting: overrides.reporting ?? null,
});

export const createPrivateModel = (overrides = {}) => ({
  forms: overrides.forms ?? null,
  queues: overrides.queues ?? null,
  rules: overrides.rules ?? null,
  validations: overrides.validations ?? null,
  state: overrides.state ?? null,
});

export const createArchitectureModel = (
  globalOverrides = {},
  privateOverrides = {},
) => ({
  global: createGlobalModel(globalOverrides),
  private: createPrivateModel(privateOverrides),
});
