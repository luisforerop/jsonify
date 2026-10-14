import { describe, expect, it, vi } from "vitest";

const protect = vi.fn();
let handler: (auth: { protect: () => void }, req: Request) => Promise<void>;

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (fn: typeof handler) => {
    handler = fn;
    return fn;
  },
  createRouteMatcher: (patterns: string[]) => {
    const regexes = patterns.map((p) => new RegExp(`^${p}`));
    return (req: { nextUrl: { pathname: string } }) =>
      regexes.some((r) => r.test(req.nextUrl.pathname));
  },
}));

await import("./proxy");

const run = async (pathname: string) => {
  protect.mockClear();
  await handler({ protect }, { nextUrl: { pathname } } as never);
  return protect.mock.calls.length > 0;
};

describe("proxy protection", () => {
  it("leaves the public form routes open", async () => {
    expect(await run("/f/abc")).toBe(false);
    expect(await run("/api/public/forms/abc")).toBe(false);
  });

  it("still protects workspace pages", async () => {
    expect(await run("/w/ws/col")).toBe(true);
  });
});
