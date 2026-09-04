#!/usr/bin/env python3
"""
Suite Principal de Pruebas contra Producción SIGECOF (10.79.6.247:1521 / sige1)
Ejecuta secuencialmente:
 1. Conexión de Cuentas
 2. Comprobación de Privilegios (SELECT / DML)
 3. Comprobación de Índices de Optimización
 4. Comprobación de Vistas Materializadas y Volumetría
"""

import os
import sys
import subprocess

TESTS = [
    ("01_probar_conexion.py", "1. Prueba de Conexión de Cuentas"),
    ("02_comprobar_privilegios.py", "2. Comprobación de Privilegios"),
    ("03_comprobar_indices.py", "3. Comprobación de Índices de Optimización"),
    ("04_comprobar_vistas.py", "4. Comprobación de Vistas Materializadas")
]

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 80)
    print(" 🚀 INICIANDO SUITE DE COMPROBACIÓN PRODUCTIVA SIGECOF (10.79.6.247:1521 / sige1)")
    print("=" * 80)

    for script_name, titulo in TESTS:
        script_path = os.path.join(base_dir, script_name)
        print(f"\n▶️ Ejecutando: {titulo} ({script_name})...")
        try:
            res = subprocess.run([sys.executable, script_path], check=False)
            if res.returncode != 0:
                print(f"⚠️ El script {script_name} finalizó con código de salida {res.returncode}")
        except Exception as e:
            print(f"❌ Error ejecutando {script_name}: {e}")

    print("\n" + "=" * 80)
    print(" 🏁 SUITE DE COMPROBACIÓN PRODUCTIVA FINALIZADA")
    print("=" * 80)

if __name__ == "__main__":
    main()
