import { type InvoiceData, formatINRPlain } from "./types";

interface DefenseTemplateProps {
    data: InvoiceData;
    copy?: "ORIGINAL FOR RECIPIENT" | "DUPLICATE FOR TRANSPORTER" | "TRIPLICATE FOR SUPPLIER";
}

export function DefenseTemplate({ data, copy = "ORIGINAL FOR RECIPIENT" }: DefenseTemplateProps) {
    const b = "2px solid #000";
    const bs = "1px solid #000";

    return (
        <div className="defense-invoice bg-white text-black" style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "10.5px", lineHeight: 1.4 }}>
            {/* Outer double border */}
            <div style={{ border: "3px double #000", padding: "2px" }}>
                <div style={{ border: bs }}>

                    {/* Copy header */}
                    <div style={{ borderBottom: b, padding: "4px 0", textAlign: "center", backgroundColor: "#f0f0f0" }}>
                        <p style={{ fontSize: "11px", fontWeight: "bold", margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>
                            {copy}
                        </p>
                    </div>

                    {/* Company Header */}
                    <div style={{ borderBottom: b, padding: "10px 14px", textAlign: "center" }}>
                        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                            {data.seller.name}
                        </h1>
                        <p style={{ fontSize: "9.5px", margin: "2px 0 0", color: "#333" }}>
                            {data.seller.address}, {data.seller.city} - {data.seller.pincode}, {data.seller.state}
                        </p>
                        <p style={{ fontSize: "9.5px", margin: "1px 0 0", color: "#333" }}>
                            Phone: {data.seller.phone} | Email: {data.seller.email}
                        </p>
                    </div>

                    {/* TAX INVOICE header */}
                    <div style={{ borderBottom: b, padding: "5px 0", textAlign: "center" }}>
                        <h2 style={{ fontSize: "13px", fontWeight: "bold", margin: 0, letterSpacing: "3px", textTransform: "uppercase" }}>
                            TAX INVOICE
                        </h2>
                    </div>

                    {/* Seller & Buyer side-by-side */}
                    <div style={{ display: "flex", borderBottom: b }}>
                        {/* Seller */}
                        <div style={{ flex: 1, padding: "6px 10px", borderRight: b }}>
                            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px", borderBottom: bs, paddingBottom: "2px" }}>
                                Details of Supplier (Billed From)
                            </p>
                            <p><strong>Name:</strong> {data.seller.name}</p>
                            <p><strong>Address:</strong> {data.seller.address}, {data.seller.city} - {data.seller.pincode}</p>
                            <p><strong>State:</strong> {data.seller.state} &nbsp;&nbsp; <strong>Code:</strong> {data.seller.stateCode}</p>
                            <p><strong>GSTIN/UIN:</strong> {data.seller.gstin}</p>
                            <p><strong>PAN:</strong> {data.seller.pan}</p>
                        </div>

                        {/* Buyer */}
                        <div style={{ flex: 1, padding: "6px 10px" }}>
                            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px", borderBottom: bs, paddingBottom: "2px" }}>
                                Details of Recipient (Billed To)
                            </p>
                            <p><strong>Name:</strong> {data.buyer.name}</p>
                            {data.buyer.division && <p><strong>Division:</strong> {data.buyer.division}</p>}
                            <p><strong>Address:</strong> {data.buyer.address}, {data.buyer.city}</p>
                            <p><strong>State:</strong> {data.buyer.state} &nbsp;&nbsp; <strong>Code:</strong> {data.buyer.stateCode}</p>
                            <p><strong>GSTIN/UIN:</strong> {data.buyer.gstin}</p>
                        </div>
                    </div>

                    {/* Detailed reference fields */}
                    <div style={{ borderBottom: b }}>
                        <div style={{ display: "flex" }}>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs, borderBottom: bs }}>
                                <strong>Invoice No:</strong> {data.invoiceNumber}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs, borderBottom: bs }}>
                                <strong>Date:</strong> {data.date}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px", borderBottom: bs }}>
                                <strong>Place of Supply:</strong> {data.placeOfSupply}
                            </div>
                        </div>
                        <div style={{ display: "flex" }}>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs, borderBottom: bs }}>
                                <strong>PO No.:</strong> {data.poReference || "—"}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs, borderBottom: bs }}>
                                <strong>Work Order No.:</strong> {data.workOrderRef || "—"}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px", borderBottom: bs }}>
                                <strong>Batch No.:</strong> {data.batchNumberRef || "—"}
                            </div>
                        </div>
                        <div style={{ display: "flex" }}>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs }}>
                                <strong>DC/Delivery Note No.:</strong> {data.deliveryNote || "—"}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px", borderRight: bs }}>
                                <strong>Gate Pass No.:</strong> {data.deliveryNote || "—"}
                            </div>
                            <div style={{ flex: 1, padding: "4px 10px" }}>
                                <strong>DA No.:</strong> —
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={dThStyle("35px", "center")}>S.No</th>
                                <th style={dThStyle("95px", "left")}>Part Number</th>
                                <th style={dThStyle("", "left")}>Description / Part Name</th>
                                <th style={dThStyle("65px", "left")}>HSN/SAC</th>
                                <th style={dThStyle("75px", "left")}>Work Order</th>
                                <th style={dThStyle("40px", "right")}>Qty</th>
                                <th style={dThStyle("35px", "center")}>Unit</th>
                                <th style={dThStyle("70px", "right")}>Rate (₹)</th>
                                <th style={dThStyle("80px", "right")}>Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr key={item.sno}>
                                    <td style={dTdStyle("center")}>{item.sno}</td>
                                    <td style={dTdStyle("left", true)}>{item.partNumber}</td>
                                    <td style={dTdStyle("left")}>{item.description}</td>
                                    <td style={dTdStyle("left")}>{item.hsnSac}</td>
                                    <td style={dTdStyle("left")}>{item.workOrder || "—"}</td>
                                    <td style={dTdStyle("right")}>{item.qty}</td>
                                    <td style={dTdStyle("center")}>{item.unit}</td>
                                    <td style={dTdStyle("right")}>{formatINRPlain(item.rate)}</td>
                                    <td style={dTdStyle("right")}>{formatINRPlain(item.amount)}</td>
                                </tr>
                            ))}
                            {/* Empty rows */}
                            {data.items.length < 6 && Array.from({ length: 6 - data.items.length }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                    <td style={dTdStyle("center")}>&nbsp;</td>
                                    <td style={dTdStyle("left")}>&nbsp;</td>
                                    <td style={dTdStyle("left")}>&nbsp;</td>
                                    <td style={dTdStyle("left")}>&nbsp;</td>
                                    <td style={dTdStyle("left")}>&nbsp;</td>
                                    <td style={dTdStyle("right")}>&nbsp;</td>
                                    <td style={dTdStyle("center")}>&nbsp;</td>
                                    <td style={dTdStyle("right")}>&nbsp;</td>
                                    <td style={dTdStyle("right")}>&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Tax Summary */}
                    <div style={{ borderTop: b }}>
                        <div style={{ display: "flex" }}>
                            {/* Amount in words */}
                            <div style={{ flex: 1, padding: "6px 10px", borderRight: b }}>
                                <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "3px" }}>Total Invoice Amount (In Words)</p>
                                <p style={{ fontSize: "11px", fontWeight: "bold", fontStyle: "italic" }}>{data.amountInWords}</p>
                            </div>
                            {/* Tax boxes */}
                            <div style={{ width: "280px" }}>
                                <div style={dSumRow}>
                                    <span>Taxable Amount</span>
                                    <span style={{ fontWeight: "bold" }}>₹ {formatINRPlain(data.subtotal)}</span>
                                </div>
                                {data.cgst > 0 && (
                                    <div style={dSumRow}>
                                        <span>CGST @ 9%</span>
                                        <span>₹ {formatINRPlain(data.cgst)}</span>
                                    </div>
                                )}
                                {data.sgst > 0 && (
                                    <div style={dSumRow}>
                                        <span>SGST @ 9%</span>
                                        <span>₹ {formatINRPlain(data.sgst)}</span>
                                    </div>
                                )}
                                {data.igst > 0 && (
                                    <div style={dSumRow}>
                                        <span>IGST @ 18%</span>
                                        <span>₹ {formatINRPlain(data.igst)}</span>
                                    </div>
                                )}
                                <div style={dSumRow}>
                                    <span>Total Tax Amount</span>
                                    <span>₹ {formatINRPlain(data.totalTax)}</span>
                                </div>
                                <div style={{ ...dSumRow, backgroundColor: "#e8e8e8", fontWeight: "bold", fontSize: "12px", borderBottom: "none" }}>
                                    <span>TOTAL</span>
                                    <span>₹ {formatINRPlain(data.grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div style={{ borderTop: b, display: "flex" }}>
                        <div style={{ flex: 1, padding: "6px 10px", borderRight: b }}>
                            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "3px" }}>Bank Details</p>
                            <p><strong>Bank:</strong> {data.seller.bankName}</p>
                            <p><strong>Branch:</strong> {data.seller.bankBranch}</p>
                            <p><strong>A/c No:</strong> {data.seller.accountNumber}</p>
                            <p><strong>IFSC:</strong> {data.seller.ifscCode}</p>
                        </div>
                        <div style={{ flex: 1, padding: "6px 10px" }}>
                            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "3px" }}>Terms & Conditions</p>
                            <p style={{ fontSize: "9.5px" }}>1. Payment due within 30 days of invoice date.</p>
                            <p style={{ fontSize: "9.5px" }}>2. Goods once sold will not be taken back.</p>
                            <p style={{ fontSize: "9.5px" }}>3. Interest @ 18% p.a. will be charged on overdue payments.</p>
                            <p style={{ fontSize: "9.5px" }}>4. Subject to Bengaluru jurisdiction only.</p>
                        </div>
                    </div>

                    {/* Declaration */}
                    <div style={{ borderTop: b, padding: "6px 10px" }}>
                        <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", marginBottom: "3px" }}>Declaration</p>
                        <p style={{ fontSize: "9.5px", fontStyle: "italic" }}>
                            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                        </p>
                    </div>

                    {/* Signature block */}
                    <div style={{ borderTop: b, display: "flex" }}>
                        <div style={{ flex: 1, padding: "6px 10px", borderRight: b, textAlign: "center" }}>
                            <p style={{ fontSize: "9px", color: "#555", marginBottom: "50px" }}>Receiver&apos;s Signature & Stamp</p>
                            <div style={{ borderTop: "1px dashed #999", marginTop: "4px", paddingTop: "4px" }}>
                                <p style={{ fontSize: "9.5px" }}>Authorized Signatory</p>
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: "6px 10px", textAlign: "center" }}>
                            <p style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "4px" }}>For {data.seller.name}</p>
                            <p style={{ fontSize: "9px", color: "#555", marginBottom: "36px" }}>(Seal & Stamp)</p>
                            <div style={{ borderTop: "1px dashed #999", marginTop: "4px", paddingTop: "4px" }}>
                                <p style={{ fontSize: "9.5px", fontWeight: "bold" }}>Authorised Signatory</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// ─── Style helpers ──────────────────────────────────────────────────
function dThStyle(width: string, textAlign: string): React.CSSProperties {
    return {
        padding: "5px 6px",
        borderBottom: "2px solid #000",
        borderRight: "1px solid #000",
        fontSize: "9px",
        fontWeight: "bold",
        textTransform: "uppercase",
        textAlign: textAlign as React.CSSProperties["textAlign"],
        width: width || undefined,
        backgroundColor: "#f0f0f0",
    };
}

function dTdStyle(textAlign: string, bold?: boolean): React.CSSProperties {
    return {
        padding: "4px 6px",
        borderBottom: "1px solid #000",
        borderRight: "1px solid #000",
        fontSize: "10px",
        verticalAlign: "top",
        textAlign: textAlign as React.CSSProperties["textAlign"],
        fontWeight: bold ? "bold" : "normal",
    };
}

const dSumRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 10px",
    borderBottom: "1px solid #000",
    fontSize: "10px",
};
