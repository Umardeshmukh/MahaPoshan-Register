import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportReportToPDF(
  elementId: string,
  fileName: string
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return false;
  }

  try {
    // Hide any buttons or controls with .no-print inside the element during capture
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for crisp Devanagari text and borders
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: Math.max(element.scrollWidth, 1200),
      ignoreElements: (el) => el.classList.contains('no-print'),
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 297; // A4 Landscape width
    const pdfHeight = 210; // A4 Landscape height
    const margin = 5;
    const contentWidth = pdfWidth - margin * 2; // 287mm
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pdfHeight - margin * 2) {
      // Fits on a single A4 landscape page
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const yPos = margin + (pdfHeight - margin * 2 - contentHeight) / 2;
      pdf.addImage(imgData, 'JPEG', margin, Math.max(margin, yPos), contentWidth, contentHeight);
    } else {
      // Multi-page slicing if content is very tall
      const pageCanvasHeight = (canvas.width * (pdfHeight - margin * 2)) / contentWidth;
      let currentSourceY = 0;
      let pageNum = 0;

      while (currentSourceY < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - currentSourceY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            currentSourceY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
          if (pageNum > 0) {
            pdf.addPage('a4', 'landscape');
          }
          const sliceContentHeight = (sliceHeight * contentWidth) / canvas.width;
          pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, sliceContentHeight);
        }

        currentSourceY += sliceHeight;
        pageNum++;
      }
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return false;
  }
}
