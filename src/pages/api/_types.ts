export type Bindings = {
  DB: D1Database;

  QBOT_TOKEN: string;
  VERIFICATION: DurableObjectNamespace;
};

export type User = {
  username: string;
  password?: string;
  qq?: string;
};
