import { describe, it, expect } from "vitest"
import { validateSql, enforceLimitClause, executeSafeQuery } from "../query-tool"

describe("validateSql", () => {
  it("allows simple SELECT queries", () => {
    const result = validateSql("SELECT * FROM issues")
    expect(result).toEqual({ valid: true })
  })

  it("allows SELECT with WHERE clause", () => {
    const result = validateSql("SELECT id, title FROM issues WHERE state = 'open'")
    expect(result).toEqual({ valid: true })
  })

  it("allows WITH (CTE) queries", () => {
    const result = validateSql(
      "WITH recent AS (SELECT * FROM issues WHERE created_at > now() - interval '30 days') SELECT * FROM recent",
    )
    expect(result).toEqual({ valid: true })
  })

  it("allows queries with leading whitespace", () => {
    const result = validateSql("  SELECT count(*) FROM issues")
    expect(result).toEqual({ valid: true })
  })

  it("is case-insensitive for SELECT/WITH", () => {
    expect(validateSql("select * from issues")).toEqual({ valid: true })
    expect(validateSql("Select * from issues")).toEqual({ valid: true })
    expect(validateSql("with cte as (select 1) select * from cte")).toEqual({
      valid: true,
    })
  })

  it("rejects INSERT statements", () => {
    const result = validateSql("INSERT INTO issues (title) VALUES ('test')")
    expect(result).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    })
  })

  it("rejects non-SELECT statements (UPDATE, DELETE, DROP, ALTER, etc.)", () => {
    const nonSelectStatements = [
      "UPDATE issues SET state = 'closed'",
      "DELETE FROM issues WHERE id = '1'",
      "DROP TABLE issues",
      "ALTER TABLE issues ADD COLUMN foo TEXT",
      "TRUNCATE TABLE issues",
      "CREATE TABLE evil (id TEXT)",
      "GRANT ALL ON issues TO public",
    ]

    for (const sql of nonSelectStatements) {
      const result = validateSql(sql)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.error).toBeTruthy()
      }
    }
  })

  it("rejects SELECT with embedded INSERT", () => {
    const result = validateSql(
      "SELECT * FROM issues; INSERT INTO issues (title) VALUES ('hack')",
    )
    expect(result).toEqual({
      valid: false,
      error: expect.stringContaining("Forbidden keyword: INSERT"),
    })
  })

  it("rejects SELECT with embedded DROP", () => {
    const result = validateSql("SELECT * FROM issues; DROP TABLE issues")
    expect(result).toEqual({
      valid: false,
      error: expect.stringContaining("Forbidden keyword: DROP"),
    })
  })

  it("rejects empty queries", () => {
    const result = validateSql("")
    expect(result).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    })
  })

  it("rejects whitespace-only queries", () => {
    const result = validateSql("   ")
    expect(result).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    })
  })
})

describe("enforceLimitClause", () => {
  it("appends LIMIT 1000 when no LIMIT is present", () => {
    const result = enforceLimitClause("SELECT * FROM issues")
    expect(result).toBe("SELECT * FROM issues LIMIT 1000")
  })

  it("preserves existing LIMIT clause", () => {
    const result = enforceLimitClause("SELECT * FROM issues LIMIT 50")
    expect(result).toBe("SELECT * FROM issues LIMIT 50")
  })

  it("preserves existing LIMIT in CTEs", () => {
    const sql = "WITH recent AS (SELECT * FROM issues LIMIT 10) SELECT * FROM recent"
    const result = enforceLimitClause(sql)
    expect(result).toBe(sql)
  })

  it("is case-insensitive for LIMIT detection", () => {
    const result = enforceLimitClause("SELECT * FROM issues limit 25")
    expect(result).toBe("SELECT * FROM issues limit 25")
  })

  it("trims trailing whitespace before appending LIMIT", () => {
    const result = enforceLimitClause("SELECT * FROM issues   ")
    expect(result).toBe("SELECT * FROM issues LIMIT 1000")
  })
})

describe("executeSafeQuery", () => {
  it("rejects invalid SQL without touching the database", async () => {
    const result = await executeSafeQuery("DROP TABLE issues", "test")
    expect(result.error).toBeTruthy()
  })

  it("rejects non-SELECT queries", async () => {
    const result = await executeSafeQuery(
      "INSERT INTO issues (title) VALUES ('x')",
      "test",
    )
    expect(result).toEqual({
      error: "Only SELECT queries are allowed",
    })
  })
})
