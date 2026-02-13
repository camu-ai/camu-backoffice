import "dotenv/config"
import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}))
