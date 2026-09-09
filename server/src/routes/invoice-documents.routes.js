import { Router } from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);

function euro(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

function safe(value, fallback = '') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

router.post('/:id/generate-pdf', async (req, res) => {
  try {
    const invoiceResult = await query(
      `SELECT * FROM abstract_invoices WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      return res.status(404).json({ message: 'Facture introuvable' });
    }

    const data = req.body || {};

    const invoiceNumber =
      data.invoice_number ||
      `FA ${invoice.invoice_year || new Date().getFullYear()}-${String(invoice.invoice_number || invoice.id).padStart(4, '0')}`;

    const invoiceDate = data.invoice_date || invoice.sent_date || invoice.created_at;
    const clientName = data.client_name || invoice.account_name || invoice.client || 'Client';
    const clientAddress = data.client_address || stripHtml(invoice.to_address);

    const lines = Array.isArray(data.lines) && data.lines.length > 0
      ? data.lines
      : [
          {
            service_date: data.service_date || '',
            purchase_order: data.purchase_order || '',
            prestation: data.prestation || 'Traduction',
            document_name: data.document_name || '',
            requester_name: data.requester_name || '',
            language_pair: data.language_pair || '',
            price_ht: Number(invoice.amount || invoice.total || 0),
          },
        ];

    const totalHt = lines.reduce((sum, line) => sum + Number(line.price_ht || 0), 0);
    const vatRate = Number(data.vat_rate ?? invoice.vat ?? 20);
    const vatAmount = totalHt * (vatRate / 100);
    const totalTtc = totalHt + vatAmount;

    const outputDir = path.resolve('storage', 'invoices');
    fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `${invoiceNumber.replaceAll(' ', '_').replaceAll('/', '-')}.pdf`;
    const filePath = path.join(outputDir, fileName);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const burgundy = '#8B0E3F';
    const blueGray = '#2F4F73';
    const lightBlue = '#DDE8F5';

    const logoPath = path.resolve('server', 'templates', 'wordsinvest-logo.png');

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 42, 28, { width: 95 });
    } else {
      doc.fillColor(burgundy).fontSize(18).text('WORDSINVEST', 42, 35);
    }

    doc
      .fillColor(blueGray)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(clientName, 410, 55, { width: 145 });

    doc
      .font('Helvetica')
      .fontSize(9)
      .text(clientAddress, 410, 75, { width: 145, lineGap: 3 });

    doc
      .fontSize(9)
      .text(new Date(invoiceDate).toLocaleDateString('fr-FR'), 410, 145);

    doc
      .fillColor(blueGray)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Facture n° ${invoiceNumber}`, 42, 170);

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(data.greeting || 'Madame,', 42, 195);

    doc
      .moveDown()
      .text(
        'Nous vous faisons parvenir votre facture pour la/les prestation(s) mentionnée(s) ci-dessous :',
        42,
        225,
        { width: 520 }
      );

    const tableTop = 260;
    const rowHeight = 28;

    const columns = [
      { label: 'Date de la prestation', x: 42, w: 82 },
      { label: 'Numéro de commande', x: 124, w: 82 },
      { label: 'Prestation', x: 206, w: 70 },
      { label: 'Nom du document', x: 276, w: 95 },
      { label: 'Nom du demandeur', x: 371, w: 78 },
      { label: 'Paire de langues', x: 449, w: 70 },
      { label: 'Prix HT (€)', x: 519, w: 50 },
    ];

    doc
      .strokeColor('#6F91B8')
      .lineWidth(1)
      .moveTo(42, tableTop)
      .lineTo(570, tableTop)
      .stroke();

    columns.forEach((col) => {
      doc
        .fillColor(blueGray)
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(col.label, col.x, tableTop + 8, {
          width: col.w,
          align: col.label.includes('Prix') ? 'right' : 'center',
        });
    });

    doc
      .moveTo(42, tableTop + 25)
      .lineTo(570, tableTop + 25)
      .stroke();

    let y = tableTop + 34;

    lines.forEach((line) => {
      const values = [
        safe(line.service_date),
        safe(line.purchase_order),
        safe(line.prestation, 'Traduction'),
        safe(line.document_name),
        safe(line.requester_name),
        safe(line.language_pair),
        euro(line.price_ht),
      ];

      values.forEach((value, index) => {
        const col = columns[index];

        doc
          .fillColor(blueGray)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(value, col.x, y, {
            width: col.w,
            align: index === 6 ? 'right' : 'center',
          });
      });

      y += rowHeight;
    });

    doc
      .strokeColor('#6F91B8')
      .moveTo(42, y - 8)
      .lineTo(570, y - 8)
      .stroke();

    const totalsX = 365;
    const labelW = 135;
    const amountW = 70;

    function totalLine(label, amount, offsetY) {
      doc
        .rect(totalsX, offsetY, labelW + amountW, 18)
        .fill(lightBlue);

      doc
        .fillColor(blueGray)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label, totalsX + 8, offsetY + 5, { width: labelW })
        .text(amount, totalsX + labelW, offsetY + 5, {
          width: amountW - 8,
          align: 'right',
        });
    }

    totalLine('Total (€ HT)', euro(totalHt), y + 4);
    totalLine(`TVA (${vatRate.toFixed(1)}%)`, euro(vatAmount), y + 24);
    totalLine('Total (€ TTC)', euro(totalTtc), y + 44);

    doc
      .fillColor(blueGray)
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        "Une indemnité forfaitaire de 40 € pour frais de recouvrement sera appliquée en cas de retard de paiement, conformément aux articles L.441-3 et L.441-6 du code de commerce. Merci de régler la facture dans un délai de 30 jours et de privilégier les virements bancaires",
        42,
        y + 82,
        { width: 520, lineGap: 2 }
      );

    doc
      .font('Helvetica-Bold')
      .text('Nos coordonnées bancaires :', 42, y + 122, { underline: true });

    doc
      .font('Helvetica-Bold')
      .text('Domiciliation :', 42, y + 145)
      .font('Helvetica')
      .text('Société Générale - Paris Villiers – France', 120, y + 145);

    doc
      .font('Helvetica-Bold')
      .text('Titulaire', 42, y + 160)
      .font('Helvetica')
      .text('WordsInvest', 120, y + 160);

    doc
      .font('Helvetica-Bold')
      .text('Banque', 42, y + 182)
      .text('Guichet', 125, y + 182)
      .text('N° de Compte', 230, y + 182)
      .text('Clé RIB', 450, y + 182);

    doc
      .font('Helvetica')
      .text('30003', 42, y + 197)
      .text('03180', 125, y + 197)
      .text('00020636262', 230, y + 197)
      .text('79', 450, y + 197);

    doc
      .font('Helvetica-Bold')
      .text('IBAN', 42, y + 220)
      .text('BIC/SWIFT', 42, y + 235);

    doc
      .font('Helvetica')
      .text('FR76 3000 3031 8000 0206 3626 279', 230, y + 220)
      .text('SOGEFRPP', 230, y + 235);

    doc
      .fontSize(9)
      .text('Bien cordialement,', 42, y + 265)
      .moveDown()
      .font('Helvetica-Bold')
      .text('Guillaume THUILLEZ')
      .font('Helvetica')
      .text('Managing Director/Gérant');

    const footerY = 705;

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 250, footerY - 35, { width: 85 });
    }

    doc
      .fillColor(blueGray)
      .fontSize(7.5)
      .text('15 rue Erlanger - 75016 Paris - Tél:+33145720984', 150, footerY, { width: 300, align: 'center' })
      .text('Site : www.wordsinvest.com', { align: 'center' })
      .text('SARL au capital de 20 000 euros', { align: 'center' })
      .text('SIRET : 522 916 998 00035', { align: 'center' })
      .text('Code APE 7430Z', { align: 'center' })
      .text('N° TVA intracommunautaire : FR76522916998', { align: 'center' });

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    res.download(filePath, fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur génération facture' });
  }
});

router.post('/:id/send-einvoice', async (req, res) => {
  try {
    await query(
      `
      UPDATE abstract_invoices
      SET status = 'Prête e-facture',
          updated_at = NOW()
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      status: 'pending_integration',
      message: "L'envoi de facture électronique sera intégré plus tard.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur préparation e-facture' });
  }
});

export default router;