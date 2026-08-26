import json

def generate_markdown(json_file, md_file):
    with open(json_file, 'r') as f:
        data = json.load(f)
        
    with open(md_file, 'w') as out:
        out.write("# Análisis Estructural del Esquema WFE_WORKFLOW\n\n")
        out.write("Este documento detalla los componentes, procedimientos, vistas y relaciones encontradas en el esquema maestro de flujos de trabajo de SIGECOF (`WFE_WORKFLOW`).\n\n")
        
        # 1. Tablas
        out.write("## 1. Tablas Principales\n\n")
        out.write("El esquema contiene un total de **{}** tablas. A continuación, el detalle (ordenado alfabéticamente):\n\n".format(len(data['tables'])))
        out.write("| Nombre de la Tabla | Cantidad Aprox. de Registros |\n")
        out.write("| :--- | :--- |\n")
        for t in data['tables']:
            out.write(f"| `{t['name']}` | {t['rows'] if t['rows'] is not None else 0} |\n")
            
        out.write("\n")
        
        # 2. Relaciones (Foreign Keys)
        out.write("## 2. Relaciones y Llaves Foráneas\n\n")
        out.write("Para entender la dependencia de los datos, a continuación se listan las relaciones (Foreign Keys) encontradas en el esquema:\n\n")
        out.write("| Tabla Origen | Columna | Referencia (Tabla Destino) | Columna Referenciada | Nombre del Constraint |\n")
        out.write("| :--- | :--- | :--- | :--- | :--- |\n")
        for r in data['relations']:
            out.write(f"| `{r['table']}` | `{r['column']}` | `{r['ref_table']}` | `{r['ref_column']}` | `{r['fk_name']}` |\n")
            
        out.write("\n")
        
        # 3. Vistas
        out.write("## 3. Vistas (Views)\n\n")
        if data['views']:
            out.write("Se encontraron las siguientes vistas:\n\n")
            for v in data['views']:
                out.write(f"- `{v}`\n")
        else:
            out.write("No se detectaron vistas en este esquema.\n")
            
        out.write("\n")
        
        # 4. Código (Procedimientos, Funciones, Paquetes)
        out.write("## 4. Código Almacenado\n\n")
        if data['code']:
            out.write("| Tipo de Objeto | Nombre del Objeto |\n")
            out.write("| :--- | :--- |\n")
            for c in data['code']:
                out.write(f"| `{c['type']}` | `{c['name']}` |\n")
        else:
            out.write("No se detectaron funciones o procedimientos almacenados.\n")
            
    print(f"Archivo {md_file} generado con éxito.")

if __name__ == "__main__":
    generate_markdown("wfe_data.json", "WFE_WORKFLOW.md")
