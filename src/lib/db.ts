import mysql, { type FieldPacket, type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise"

type GlobalWithPool = typeof globalThis & {
  mysqlPool?: Pool
}

function resolveConnectionConfig() {
  const url = process.env.DATABASE_URL

  if (url) {
    return { uri: url }
  }

  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "datn_ecommerce",
  }
}

function createPool() {
  const config = resolveConnectionConfig()

  return "uri" in config
    ? mysql.createPool({
        uri: config.uri,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
        queueLimit: 0,
      })
    : mysql.createPool({
        ...config,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
        queueLimit: 0,
      })
}

const globalForPool = globalThis as GlobalWithPool

export const pool = globalForPool.mysqlPool ?? createPool()

if (process.env.NODE_ENV !== "production") {
  globalForPool.mysqlPool = pool
}

export async function query<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params: Array<string | number | boolean | Date | null> = []
): Promise<[T, FieldPacket[]]> {
  return pool.query<T>(sql, params)
}

export async function execute(
  sql: string,
  params: Array<string | number | boolean | Date | null> = []
): Promise<[ResultSetHeader, FieldPacket[]]> {
  return pool.execute<ResultSetHeader>(sql, params)
}

export async function getConnection() {
  return pool.getConnection()
}
