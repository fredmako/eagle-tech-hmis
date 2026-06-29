import { describe, it, expect } from "vitest";
import { createGlobalModel, createPrivateModel } from "../architecture";

describe("architecture model split", () => {
  it("keeps shared concerns in the global model", () => {
    const globalModel = createGlobalModel({
      identity: { id: "u1", role: "admin" },
      patient: { id: "p1", name: "Jane" },
      billing: { status: "paid" },
      audit: { action: "created" },
      permissions: { canManage: true },
      reporting: { category: "daily" },
    });

    expect(globalModel.identity.id).toBe("u1");
    expect(globalModel.patient.name).toBe("Jane");
    expect(globalModel.billing.status).toBe("paid");
    expect(globalModel.audit.action).toBe("created");
    expect(globalModel.permissions.canManage).toBe(true);
    expect(globalModel.reporting.category).toBe("daily");
  });

  it("keeps department-specific concerns in the private model", () => {
    const privateModel = createPrivateModel({
      forms: { department: "radiology", step: 2 },
      queues: { department: "pharmacy", waiting: 4 },
      rules: { specialty: "maternity" },
      validations: { local: true },
      state: { draft: true },
    });

    expect(privateModel.forms.department).toBe("radiology");
    expect(privateModel.queues.waiting).toBe(4);
    expect(privateModel.rules.specialty).toBe("maternity");
    expect(privateModel.validations.local).toBe(true);
    expect(privateModel.state.draft).toBe(true);
  });
});
