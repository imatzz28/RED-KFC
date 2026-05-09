import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import QRCode from 'qrcode';
import { SafeHandsCert, Employee, SafeHandsSettings } from '@/types';

(pdfMake as any).vfs = pdfFonts.vfs;

export const safeHandsGenerator = {
  generateQR: async (code: string): Promise<string> => {
    // Definir la URL de validación pública
    // En producción esto debería ser una URL real
    const validationUrl = `${window.location.origin}/verify/${code}`;
    return await QRCode.toDataURL(validationUrl, {
      margin: 1,
      width: 150,
      color: {
        dark: '#1a1c23',
        light: '#ffffff'
      }
    });
  },

  downloadCertificate: async (cert: SafeHandsCert, employee: Employee, settings: SafeHandsSettings) => {
    const qrDataUrl = await safeHandsGenerator.generateQR(cert.certificateCode);

    const docDefinition: any = {
      pageSize: { width: 300, height: 450 },
      pageMargins: [20, 20, 20, 20],
      content: [
        // Header
        {
          canvas: [
            { type: 'rect', x: -20, y: -20, w: 300, h: 80, color: '#e60000' }
          ]
        },
        {
          text: 'SAFE HANDS',
          color: 'white',
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [0, -60, 0, 5]
        },
        {
          text: 'CERTIFICADO DE MANIPULACIÓN',
          color: 'white',
          fontSize: 8,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 0]
        },

        // Body
        {
          text: employee.name.toUpperCase(),
          fontSize: 14,
          bold: true,
          alignment: 'center',
          margin: [0, 40, 0, 5],
          color: '#1a1c23'
        },
        {
          text: `C.C. ${employee.id}`,
          fontSize: 10,
          alignment: 'center',
          color: '#64748b',
          margin: [0, 0, 0, 20]
        },

        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'FECHA EMISIÓN', fontSize: 7, bold: true, color: '#94a3b8' },
                { text: cert.issueDate, fontSize: 10, bold: true, color: '#1e293b' },
                { text: 'FECHA VENCIMIENTO', fontSize: 7, bold: true, color: '#94a3b8', margin: [0, 10, 0, 0] },
                { text: cert.expiryDate, fontSize: 10, bold: true, color: '#e60000' }
              ]
            },
            {
              width: 'auto',
              image: qrDataUrl,
              fit: [80, 80]
            }
          ],
          margin: [0, 0, 0, 30]
        },

        // Signature Area
        {
          stack: [
            settings.signatureBase64 ? {
              image: settings.signatureBase64,
              fit: [100, 40],
              alignment: 'center'
            } : { text: '', height: 40 },
            { 
              canvas: [{ type: 'line', x1: 50, y1: 0, x2: 210, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }],
              margin: [0, 5, 0, 5]
            },
            { text: settings.responsibleName.toUpperCase(), fontSize: 8, bold: true, alignment: 'center', color: '#1e293b' },
            { text: 'DEPARTAMENTO DE CALIDAD', fontSize: 6, alignment: 'center', color: '#94a3b8' }
          ]
        },

        // Footer
        {
          text: `CÓDIGO DE VERIFICACIÓN: ${cert.certificateCode}`,
          fontSize: 6,
          alignment: 'center',
          color: '#cbd5e1',
          margin: [0, 40, 0, 0]
        }
      ],
      defaultStyle: {
        font: 'Helvetica'
      }
    };

    pdfMake.createPdf(docDefinition).download(`Carnet_${employee.id}.pdf`);
  }
};
