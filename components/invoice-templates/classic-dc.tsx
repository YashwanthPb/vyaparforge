import { type DCData } from "./types";

export function ClassicDC({ data }: { data: DCData }) {
  return (
    <div className="classic-dc bg-white text-black" style={{ fontFamily: "'Times New Roman', Georgia, serif", fontSize: "11px", lineHeight: 1.4 }}>
      <div style={{ border: "2px solid #000", padding: "0" }}>
        {/* Company Header */}
        <div style={{ borderBottom: "2px solid #000", padding: "12px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, letterSpacing: "1px", textTransform: "uppercase" }}>
            {data.seller.name}
          </h1>
          <p style={{ fontSize: "10px", margin: "2px 0 0", color: "#333" }}>
            {data.seller.address}, {data.seller.city} - {data.seller.pincode}
          </p>
          <p style={{ fontSize: "10px", margin: "1px 0 0", color: "#333" }}>
            Phone: {data.seller.phone} | Email: {data.seller.email}
          </p>
        </div>

        {/* DELIVERY CHALLAN label */}
        <div style={{ borderBottom: "1px solid #000", padding: "6px 0", textAlign: "center", backgroundColor: "#f5f5f5" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, letterSpacing: "2px", textTransform: "uppercase" }}>
            Delivery Challan
          </h2>
        </div>

        {/* Seller & Buyer */}
        <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
          <div style={{ flex: 1, padding: "8px 12px", borderRight: "1px solid #000" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Consignor</p>
            <p style={{ fontWeight: "bold", fontSize: "12px" }}>{data.seller.name}</p>
            <p>{data.seller.address}</p>
            <p>{data.seller.city} - {data.seller.pincode}</p>
            <p>State: {data.seller.state} | Code: {data.seller.stateCode}</p>
            <p><strong>GSTIN:</strong> {data.seller.gstin}</p>
          </div>
          <div style={{ flex: 1, padding: "8px 12px" }}>
            <p style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Consignee</p>
            <p style={{ fontWeight: "bold", fontSize: "12px" }}>{data.buyer.name}</p>
            <p>{data.buyer.division}</p>
            <p>{data.buyer.address}, {data.buyer.city}</p>
            <p>State: {data.buyer.state} | Code: {data.buyer.stateCode}</p>
            <p><strong>GSTIN:</strong> {data.buyer.gstin}</p>
          </div>
        </div>

        {/* DC metadata */}
        <div style={{ display: "flex", borderBottom: "1px solid #000", fontSize: "10px" }}>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>DC No:</strong> {data.dcNumber}
          </div>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>Date:</strong> {data.date}
          </div>
          <div style={{ flex: 1, padding: "6px 12px", borderRight: "1px solid #000" }}>
            <strong>PO Ref:</strong> {data.poReference}
          </div>
          <div style={{ flex: 1, padding: "6px 12px" }}>
            <strong>Vehicle No:</strong> {data.vehicleNumber || "—"}
          </div>
        </div>

        {/* Transport details row */}
        <div style={{ borderBottom: "1px solid #000", padding: "6px 12px", fontSize: "10px" }}>
          <strong>Transport Details:</strong> {data.transportDetails || "By Road"}
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={dcThStyle({ width: "40px", textAlign: "center" })}>S.No</th>
              <th style={dcThStyle({ width: "120px" })}>Part Number</th>
              <th style={dcThStyle({})}>Description</th>
              <th style={dcThStyle({ width: "100px" })}>Work Order</th>
              <th style={dcThStyle({ width: "60px", textAlign: "right" })}>Qty</th>
              <th style={dcThStyle({ width: "60px", textAlign: "center", borderRight: "none" })}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.sno}>
                <td style={dcTdStyle({ textAlign: "center" })}>{item.sno}</td>
                <td style={dcTdStyle({ fontWeight: "bold" })}>{item.partNumber}</td>
                <td style={dcTdStyle({})}>{item.description}</td>
                <td style={dcTdStyle({})}>{item.workOrder || "—"}</td>
                <td style={dcTdStyle({ textAlign: "right", fontWeight: "bold" })}>{item.qty}</td>
                <td style={dcTdStyle({ textAlign: "center", borderRight: "none" })}>{item.unit}</td>
              </tr>
            ))}
            {/* Fill empty rows */}
            {data.items.length < 5 && Array.from({ length: 5 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={dcTdStyle({ textAlign: "center" })}>&nbsp;</td>
                <td style={dcTdStyle({})}>&nbsp;</td>
                <td style={dcTdStyle({})}>&nbsp;</td>
                <td style={dcTdStyle({})}>&nbsp;</td>
                <td style={dcTdStyle({ textAlign: "right" })}>&nbsp;</td>
                <td style={dcTdStyle({ textAlign: "center", borderRight: "none" })}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Remarks */}
        {data.remarks && (
          <div style={{ borderTop: "1px solid #000", padding: "8px 12px", fontSize: "10px" }}>
            <strong>Remarks:</strong> {data.remarks}
          </div>
        )}

        {/* Footer - Signatures */}
        <div style={{ borderTop: "2px solid #000", display: "flex" }}>
          <div style={{ flex: 1, padding: "10px 12px", borderRight: "1px solid #000", textAlign: "center" }}>
            <p style={{ fontSize: "10px", marginBottom: "44px" }}>Received in good condition</p>
            <p style={{ borderTop: "1px dashed #999", paddingTop: "4px", fontSize: "10px" }}>Receiver&apos;s Signature & Stamp</p>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "40px" }}>For {data.seller.name}</p>
            <p style={{ borderTop: "1px dashed #999", paddingTop: "4px", fontSize: "10px" }}>Dispatched By (Authorized Signatory)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function dcThStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid #000",
    borderRight: "1px solid #000",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "left",
    ...extra,
  } as React.CSSProperties;
}

function dcTdStyle(extra: Record<string, string | undefined>): React.CSSProperties {
  return {
    padding: "5px 8px",
    borderBottom: "1px solid #ddd",
    borderRight: "1px solid #ddd",
    fontSize: "10.5px",
    verticalAlign: "top",
    ...extra,
  } as React.CSSProperties;
}
