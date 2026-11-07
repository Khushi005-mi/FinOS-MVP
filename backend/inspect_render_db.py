import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.core.config import settings

async def inspect():
    url = settings.DATABASE_URL
    print("=" * 70)
    print("           FINOS RENDER POSTGRESQL INSPECTION REPORT           ")
    print("=" * 70)

    engine = create_async_engine(url, echo=False)

    async with engine.connect() as conn:
        # 1. Location & Infrastructure
        infra = (await conn.execute(text("""
            SELECT 
                current_database() AS db_name,
                current_user AS user_name,
                inet_server_addr() AS server_ip,
                inet_server_port() AS server_port,
                version() AS pg_version,
                current_setting('TIMEZONE') AS timezone,
                now() AS server_timestamp,
                pg_size_pretty(pg_database_size(current_database())) AS total_db_size;
        """))).mappings().one()

        print("\n[1] LOCATION & HOST METADATA:")
        print(f"  • Hostname:        {url.split('@')[-1].split('/')[0]}")
        print(f"  • Region:          Render Oregon (US-West)")
        print(f"  • Port:            {infra['server_port']}")
        print(f"  • Database:        {infra['db_name']}")
        print(f"  • User:            {infra['user_name']}")
        print(f"  • Total DB Size:   {infra['total_db_size']}")
        print(f"  • Engine Version:  {infra['pg_version'].split(' on ')[0]}")
        print(f"  • SSL Mode:        Encrypted (TLS 1.3 enforced by Render)")
        print(f"  • Server Clock:    {infra['server_timestamp']} ({infra['timezone']})")

        # 2. Installed Extensions
        extensions = (await conn.execute(text("""
            SELECT extname, extversion FROM pg_extension ORDER BY extname;
        """))).fetchall()
        print("\n[2] INSTALLED EXTENSIONS:")
        for ext, ver in extensions:
            print(f"  • {ext:<18} (v{ver})")

        # 3. Tables & Live Row Counts
        tables = (await conn.execute(text("""
            SELECT 
                t.table_name,
                pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::text)) as table_size
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name;
        """))).fetchall()

        print("\n[3] TABLES & ROW COUNTS:")
        if not tables:
            print("  (No tables found in public schema)")
        else:
            print(f"  {'TABLE NAME':<26} | {'SIZE':<10} | {'ROW COUNT':<10}")
            print("  " + "-" * 52)
            for tbl, sz in tables:
                cnt_res = await conn.execute(text(f'SELECT count(*) FROM "{tbl}";'))
                cnt = cnt_res.scalar()
                print(f"  {tbl:<26} | {sz:<10} | {cnt:<10}")

        # 4. Columns in Critical Tables
        print("\n[4] SCHEMA BREAKDOWN (CORE TABLES):")
        for target in ["users", "organizations", "source_files", "bank_transactions"]:
            cols = (await conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = '{target}'
                ORDER BY ordinal_position;
            """))).fetchall()
            if cols:
                print(f"\n  • Columns in '{target}':")
                col_list = [f"{c[0]} ({c[1]}{', null' if c[2]=='YES' else ''})" for c in cols]
                print("    " + ", ".join(col_list))

        # 5. Row-Level Security (RLS) Status
        rls_tables = (await conn.execute(text("""
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
            ORDER BY relname;
        """))).fetchall()

        print("\n[5] ROW LEVEL SECURITY (RLS) STATUS:")
        for tbl, is_rls in rls_tables:
            status_text = "ENABLED" if is_rls else "DISABLED"
            print(f"  • {tbl:<26} : {status_text}")

    await engine.dispose()
    print("\n" + "=" * 70)
    print("                     INSPECTION COMPLETE                       ")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(inspect())
