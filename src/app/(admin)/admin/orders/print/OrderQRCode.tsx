"use client";

import { QRCodeSVG } from "qrcode.react";

export default function OrderQRCode({ value }: { value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <QRCodeSVG
        value={value}
        size={72}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
      />
    </div>
  );
}
