import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const BRAND_BORDEAUX = '8B0E3F';
const BRAND_ANTHRACITE = '2F2F2F';
const BRAND_GREY = '4E4E4E';
const BRAND_LIGHT = 'F8F7F6';
const BRAND_BORDER = 'E8E3DF';
const WHITE = 'FFFFFF';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString('fr-FR');

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);

  return date.toLocaleDateString('fr-FR');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(asNumber(value));
}

function normalizeQuoteNumber(value) {
  return safeText(value, '#')
    .replace(/^devis\s*:?\s*/i, '')
    .trim();
}

function quoteSubject(value) {
  const number = normalizeQuoteNumber(value);
  return `Objet : devis ${number || '#'}`;
}

function lineDescription(line) {
  return safeText(line.description || line.label || line.prestation, 'Traduction');
}

function lineQuantity(line) {
  return asNumber(line.quantity ?? line.qty ?? 1);
}

function lineUnitPrice(line) {
  return asNumber(line.unit_price_ht ?? line.unitPriceHt ?? line.unit_price ?? 0);
}

function lineVatRate(line) {
  return asNumber(line.vat_rate ?? line.vatRate ?? line.tva ?? 20);
}

function lineTotalHt(line) {
  return lineQuantity(line) * lineUnitPrice(line);
}

function lineVat(line) {
  return lineTotalHt(line) * (lineVatRate(line) / 100);
}

function getLogoPath() {
  const candidates = [
    process.env.WORDSINVEST_LOGO_PATH,
    path.resolve(process.cwd(), 'templates', 'wordsinvest-logo.png'),
    path.resolve(process.cwd(), 'server', 'templates', 'wordsinvest-logo.png'),
    path.resolve(__dirname, '../../templates/wordsinvest-logo.png'),
    path.resolve(__dirname, '../templates/wordsinvest-logo.png'),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function tableBorders(color = BRAND_BORDER) {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color },
    bottom: { style: BorderStyle.SINGLE, size: 1, color },
    left: { style: BorderStyle.SINGLE, size: 1, color },
    right: { style: BorderStyle.SINGLE, size: 1, color },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color },
  };
}

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: WHITE },
    bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
    left: { style: BorderStyle.NONE, size: 0, color: WHITE },
    right: { style: BorderStyle.NONE, size: 0, color: WHITE },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: WHITE },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: WHITE },
  };
}

function cell(text, options = {}) {
  const {
    bold = false,
    color = BRAND_GREY,
    fill,
    alignment = AlignmentType.LEFT,
    width,
  } = options;

  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: {
      top: 120,
      bottom: 120,
      left: 120,
      right: 120,
    },
    children: [
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: safeText(text, '—'),
            bold,
            color,
            size: 20,
          }),
        ],
      }),
    ],
  });
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 85 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, color: BRAND_ANTHRACITE, size: 22 }),
      new TextRun({ text: safeText(value, '—'), color: BRAND_GREY, size: 22 }),
    ],
  });
}

function spacer(after = 300) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function buildLogoParagraph() {
  const logoPath = getLogoPath();

  if (logoPath) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new ImageRun({
          data: fs.readFileSync(logoPath),
          transformation: { width: 260, height: 145 },
        }),
      ],
    });
  }

  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: 'WORDS', bold: true, size: 34, color: BRAND_BORDEAUX }),
      new TextRun({ text: 'INVEST', bold: true, size: 34, color: BRAND_GREY }),
    ],
  });
}

function buildHeader(payload) {
  const quoteNumber = normalizeQuoteNumber(payload.quote_number);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 54, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [buildLogoParagraph()],
          }),
          new TableCell({
            width: { size: 46, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [
              labelValue('Date', formatDate(payload.quote_date)),
              labelValue('Numéro de devis', quoteNumber),
              spacer(300),
              labelValue('Nom du client', payload.customer_name),
              labelValue('Adresse', payload.customer_address),
              labelValue('Code Postal et Ville', payload.customer_postal_city),
              labelValue('Numéro de téléphone', payload.customer_phone),
              labelValue('Email', payload.customer_email),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildLinesTable(lines = []) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell('Prestation', { bold: true, color: BRAND_ANTHRACITE, fill: BRAND_LIGHT, width: 46 }),
        cell('Qté', { bold: true, color: BRAND_ANTHRACITE, fill: BRAND_LIGHT, width: 12, alignment: AlignmentType.RIGHT }),
        cell('PU HT', { bold: true, color: BRAND_ANTHRACITE, fill: BRAND_LIGHT, width: 16, alignment: AlignmentType.RIGHT }),
        cell('TVA', { bold: true, color: BRAND_ANTHRACITE, fill: BRAND_LIGHT, width: 12, alignment: AlignmentType.RIGHT }),
        cell('Total HT', { bold: true, color: BRAND_ANTHRACITE, fill: BRAND_LIGHT, width: 14, alignment: AlignmentType.RIGHT }),
      ],
    }),
    ...lines.map((line) =>
      new TableRow({
        children: [
          cell(lineDescription(line)),
          cell(String(lineQuantity(line)), { alignment: AlignmentType.RIGHT }),
          cell(formatCurrency(lineUnitPrice(line)), { alignment: AlignmentType.RIGHT }),
          cell(`${lineVatRate(line)} %`, { alignment: AlignmentType.RIGHT }),
          cell(formatCurrency(lineTotalHt(line)), { alignment: AlignmentType.RIGHT }),
        ],
      }),
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows,
  });
}

function buildTotalsTable(lines = []) {
  const subtotal = lines.reduce((sum, line) => sum + lineTotalHt(line), 0);
  const vat = lines.reduce((sum, line) => sum + lineVat(line), 0);
  const total = subtotal + vat;

  return new Table({
    alignment: AlignmentType.RIGHT,
    width: { size: 42, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: [
      new TableRow({
        children: [
          cell('Total HT', { bold: true, fill: BRAND_LIGHT }),
          cell(formatCurrency(subtotal), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell('TVA', { bold: true, fill: BRAND_LIGHT }),
          cell(formatCurrency(vat), { alignment: AlignmentType.RIGHT }),
        ],
      }),
      new TableRow({
        children: [
          cell('Total TTC', { bold: true, color: WHITE, fill: BRAND_BORDEAUX }),
          cell(formatCurrency(total), { bold: true, color: BRAND_BORDEAUX, alignment: AlignmentType.RIGHT }),
        ],
      }),
    ],
  });
}

function buildFooter() {
  const lines = [
    '15 rue Erlanger - 75016 Paris - Tél : +33 1 45 72 09 84',
    'Site : www.wordsinvest.com',
    'SARL au capital de 20 000 euros',
    'SIRET : 522 916 998 00035',
    'Code APE 7430Z',
    'N° TVA intracommunautaire : FR76522916998',
  ];

  return new Footer({
    children: lines.map(
      (text) =>
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 10 },
          children: [new TextRun({ text, size: 16, color: BRAND_ANTHRACITE })],
        }),
    ),
  });
}

export async function generateQuoteDocx(payload) {
  const lines = Array.isArray(payload.lines) && payload.lines.length > 0
    ? payload.lines
    : [{ description: 'Traduction', quantity: 1, unit_price_ht: 0, vat_rate: 20 }];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Georgia',
            size: 22,
            color: BRAND_ANTHRACITE,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
              footer: 360,
            },
          },
        },
        footers: {
          default: buildFooter(),
        },
        children: [
          buildHeader(payload),
          spacer(760),
          new Paragraph({
            spacing: { after: 420 },
            children: [
              new TextRun({
                text: quoteSubject(payload.quote_number),
                bold: true,
                color: BRAND_ANTHRACITE,
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [new TextRun({ text: 'Madame, Monsieur,', color: BRAND_ANTHRACITE, size: 23 })],
          }),
          new Paragraph({
            spacing: { after: 420 },
            children: [
              new TextRun({ text: 'Veuillez trouver ci-dessous le devis pour la traduction de votre document ', size: 23 }),
              new TextRun({ text: safeText(payload.document_name, '—'), italics: true, bold: true, color: BRAND_BORDEAUX, size: 23 }),
              new TextRun({ text: ' en langue : ', size: 23 }),
              new TextRun({ text: safeText(payload.target_language, '—'), italics: true, bold: true, color: BRAND_BORDEAUX, size: 23 }),
            ],
          }),
          buildLinesTable(lines),
          spacer(240),
          buildTotalsTable(lines),
          payload.notes
            ? new Paragraph({
                spacing: { before: 350, after: 350 },
                children: [
                  new TextRun({ text: 'Notes : ', bold: true, size: 22 }),
                  new TextRun({ text: safeText(payload.notes), size: 22 }),
                ],
              })
            : spacer(350),
          new Paragraph({
            spacing: { before: 450, after: 180 },
            children: [new TextRun({ text: 'Nous restons à votre disposition si vous avez des questions.', size: 23 })],
          }),
          new Paragraph({ children: [new TextRun({ text: 'Bien cordialement,', size: 23 })] }),
          new Paragraph({ children: [new TextRun({ text: 'L’équipe WORDSINVEST', size: 23 })] }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
