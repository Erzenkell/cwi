export async function nextInvoiceNumber(client) {
  const year = new Date().getFullYear();

  await client.query(
    `
    INSERT INTO invoice_sequences (year, current_value)
    VALUES ($1, 0)
    ON CONFLICT (year) DO NOTHING
    `,
    [year]
  );

  const result = await client.query(
    `
    UPDATE invoice_sequences
    SET current_value = current_value + 1
    WHERE year = $1
    RETURNING current_value
    `,
    [year]
  );

  return `${year}-${result.rows[0].current_value}`;
}