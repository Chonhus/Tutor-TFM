import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "https://esm.sh/docx@8?bundle";

// Genera un .docx con la última versión de cada tarea (agrupada por fase) y
// dispara su descarga. Se ejecuta en el navegador -- ni el texto del alumno
// ni el feedback pasan por ningún servidor adicional para esto.
export async function exportarItinerarioWord(nombreAlumno, fases, envios) {
  const children = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: `TFM — ${nombreAlumno}` })],
    }),
  ];

  fases.forEach((fase) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: fase.titulo, spacing: { before: 300 } }));
    (fase.tareas_config || []).forEach((tarea) => {
      const intentos = envios
        .filter((e) => e.tareas_config?.id === tarea.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const ultimo = intentos[intentos.length - 1];

      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: tarea.titulo }));
      if (ultimo) {
        ultimo.texto.split("\n").forEach((linea) => {
          children.push(new Paragraph({ children: [new TextRun({ text: linea })] }));
        });
      } else {
        children.push(new Paragraph({ children: [new TextRun({ text: "(Sin envío todavía)", italics: true })] }));
      }
    });
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TFM-${nombreAlumno.replace(/\s+/g, "-")}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
