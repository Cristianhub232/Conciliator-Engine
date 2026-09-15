#!/usr/bin/env python3
"""
metabase_client.py - Cliente unificado para consultas y auditorías vía API de Metabase (Producción SIGECOF).
Consolida y reemplaza:
  - metabase_query.py
  - auditar_planilla_metabase.py
"""

import urllib.request
import urllib.error
import json
import decimal
import sys
import argparse
from datetime import datetime

HOST = "http://10.78.30.63:3000"
TOKEN = "mb_LQvLCtYDiQRzbuRMaF4rLemlYcgAid3gXUGQjHvDZ50="
DB_ID = 33  # SIGECOF-PROD

class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        return super(Encoder, self).default(obj)

def run_query(sql_query: str):
    """Ejecuta una consulta SQL nativa en Metabase y devuelve las columnas y filas."""
    url = f"{HOST}/api/dataset"
    headers = {
        "x-api-key": TOKEN,
        "Content-Type": "application/json"
    }
    payload = {
        "database": DB_ID,
        "type": "native",
        "native": {
            "query": sql_query
        }
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'error' in result:
                return None, None, result['error']
            if 'data' in result and 'rows' in result['data']:
                cols = [c['name'] for c in result['data']['cols']]
                rows = result['data']['rows']
                return cols, rows, None
            return [], [], None
    except Exception as e:
        return None, None, str(e)

def print_table(cols, rows):
    if not rows:
        print("  (Sin resultados)")
        return
    # Calcular anchos
    widths = [len(c) for c in cols]
    for r in rows[:100]:
        for i, val in enumerate(r):
            widths[i] = max(widths[i], len(str(val or '')))
    
    header = " | ".join([f"{cols[i]:<{widths[i]}}" for i in range(len(cols))])
    sep = "-+-".join(["-" * widths[i] for i in range(len(cols))])
    print(header)
    print(sep)
    for r in rows[:100]:
        print(" | ".join([f"{str(r[i] if r[i] is not None else ''):<{widths[i]}}" for i in range(len(cols))]))
    if len(rows) > 100:
        print(f"... y {len(rows) - 100} filas adicionales.")

def snapshot_planilla(planilla_id: str):
    """Audita el estado de una planilla en TXT_SENIAT, PLANILLA y LOTE vía Metabase."""
    print(f"\n=== SNAPSHOT METABASE: PLANILLA {planilla_id} ===")
    
    queries = {
        "ORG_LIQ.TXT_SENIAT": f"SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '{planilla_id}'",
        "ORG_LIQ.PLANILLA": f"SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '{planilla_id}'",
        "ORG_LIQ.DET_PLANILLA": f"SELECT * FROM ORG_LIQ.DET_PLANILLA WHERE PLANILLA_ID = '{planilla_id}'"
    }
    
    for tbl, q in queries.items():
        print(f"\n--- {tbl} ---")
        cols, rows, err = run_query(q)
        if err:
            print(f"  Error: {err}")
        else:
            print_table(cols, rows)

def main():
    parser = argparse.ArgumentParser(description="Cliente SQL vía Metabase API (Producción SIGECOF)")
    parser.add_argument("--sql", "-s", help="Consulta SQL a ejecutar en Metabase")
    parser.add_argument("--snapshot", help="Auditar planilla específica en TXT, PLANILLA y DET_PLANILLA")
    
    args = parser.parse_args()
    
    if not args.sql and not args.snapshot:
        print("\nCliente Metabase SIGECOF-PROD (DB 33)")
        print("1. Ejecutar consulta SQL (--sql)")
        print("2. Snapshot de planilla (--snapshot)")
        print("3. Salir")
        op = input("Opción (1-3): ").strip()
        if op == "1":
            args.sql = input("SQL query: ").strip()
        elif op == "2":
            args.snapshot = input("Número de planilla: ").strip()
        else:
            return

    if args.snapshot:
        snapshot_planilla(args.snapshot)
    elif args.sql:
        print(f"\nEjecutando en Metabase...")
        cols, rows, err = run_query(args.sql)
        if err:
            print(f"Error: {err}")
        else:
            print_table(cols, rows)

if __name__ == "__main__":
    main()
