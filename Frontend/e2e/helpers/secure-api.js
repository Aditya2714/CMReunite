import { test as base, expect } from "@playwright/test";
export const secureApi = (context) => {
  if (context._cmCsrf) return context;
  context._cmCsrf = true;
  for (const method of ["post", "put", "patch", "delete"]) {
    const original = context[method].bind(context);
    context[method] = async (url, options = {}) => {
      const response = await context.get("/auth/csrf");
      const payload = await response.json();
      return original(url, { ...options, headers: { ...options.headers, "X-CSRF-Token": payload.data.csrfToken } });
    };
  }
  return context;
};
export const test = base.extend({
  page: async ({ page }, use) => { secureApi(page.request); await use(page); },
  request: async ({ request }, use) => { secureApi(request); await use(request); },
});
export { expect };
