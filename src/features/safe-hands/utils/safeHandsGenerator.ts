import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import QRCode from 'qrcode';
import { SafeHandsCert, SafeHandsSettings } from '@/types';
import { templateBase64 } from './templateBase64';

(pdfMake as any).vfs = pdfFonts.vfs;

export const safeHandsGenerator = {
  generateQR: async (code: string): Promise<string> => {
    try {
      const validationUrl = `${window.location.origin}/verify/${code}`;
      return await QRCode.toDataURL(validationUrl, {
        margin: 1,
        width: 150,
        color: { dark: '#1a1c23', light: '#ffffff' }
      });
    } catch (err) {
      console.error("Error generating QR:", err);
      throw err;
    }
  },

  downloadCertificate: async (cert: SafeHandsCert, employee: any, settings: SafeHandsSettings) => {
    console.log("Iniciando generación de certificado para:", employee.name);
    
    try {
      const qrDataUrl = await safeHandsGenerator.generateQR(cert.certificateCode);
      console.log("QR generado con éxito");
      
      const formatDate = (d: string) => {
        if (!d) return "N/A";
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const parts = d.split('-');
        if (parts.length !== 3) return d;
        const [year, month, day] = parts;
        return `${parseInt(day)} de ${months[parseInt(month)-1]} ${year}`;
      };

      const docDefinition: any = {
        pageSize: { width: 600, height: 400 },
        pageMargins: [0, 0, 0, 0],
        background: [
          {
            image: 'templateBackground',
            width: 600,
            height: 400
          }
        ],
        content: [
        {
          text: (employee.name || "N/A").toUpperCase(),
          fontSize: 13,
          bold: true,
          color: '#1a1c23',
          absolutePosition: { x: 218, y: 153 }
        },
        {
          text: employee.id || "N/A",
          fontSize: 14,
          bold: true,
          color: '#1a1c23',
          absolutePosition: { x: 218, y: 205 }
        },
        {
          text: formatDate(cert.expiryDate),
          fontSize: 14,
          bold: true,
          color: '#1a1c23',
          absolutePosition: { x: 218, y: 255 }
        },
        {
          text: (settings.responsibleName || "ESPECIALISTA").toUpperCase(),
          fontSize: 10,
          bold: true,
          color: '#1a1c23',
          alignment: 'center',
          absolutePosition: { x: 200, y: 358 },
          width: 220
        },
        // Marco rojo redondeado para el QR
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 110,
              h: 110,
              r: 8,
              lineColor: '#e60000',
              lineWidth: 2
            }
          ],
          absolutePosition: { x: 457, y: 157 }
        },
        {
          image: qrDataUrl,
          width: 100,
          absolutePosition: { x: 462, y: 162 }
        },
        // Código único bajo el QR (alineado al borde derecho del marco)
        {
          text: cert.certificateCode,
          fontSize: 6,
          color: '#94a3b8',
          width: 100, // Ajustado al mismo ancho del QR
          absolutePosition: { x: 462, y: 268 }, // Alineado exactamente en la X del QR
        },
          settings.signatureBase64 ? {
            image: settings.signatureBase64,
            width: 205,
            absolutePosition: { x: 170, y: 280 }
          } : null
        ].filter(Boolean),
        images: {
          templateBackground: templateBase64
        }
      };

      console.log("Documento pdfMake listo, disparando descarga...");
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download(`Carnet_SafeHands_${employee.id}.pdf`);
      console.log("Descarga iniciada.");
      
    } catch (error) {
      console.error("Error fatal en downloadCertificate:", error);
      throw error;
    }
  }
};
