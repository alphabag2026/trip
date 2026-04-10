import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture a DOM element and save it as a PDF file.
 * Works entirely in the browser – no server round-trip required.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  fileName: string = "document.pdf",
  options?: { scale?: number; margin?: number }
) {
  const scale = options?.scale ?? 2;
  const margin = options?.margin ?? 10;

  // Capture the element as a canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = (imgHeight * contentWidth) / imgWidth;

  const pdf = new jsPDF({
    orientation: contentHeight > pdfHeight ? "portrait" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // If content fits in one page
  if (contentHeight + margin * 2 <= pdfHeight) {
    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
  } else {
    // Multi-page: split the image across pages
    let remainingHeight = contentHeight;
    let position = 0;

    while (remainingHeight > 0) {
      const pageContentHeight = pdfHeight - margin * 2;
      const sliceHeight = Math.min(remainingHeight, pageContentHeight);

      if (position > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        imgData,
        "PNG",
        margin,
        margin - position,
        contentWidth,
        contentHeight
      );

      remainingHeight -= pageContentHeight;
      position += pageContentHeight;
    }
  }

  pdf.save(fileName);
}

/**
 * Generate a voucher-specific PDF with formatted hotel information
 */
export async function downloadVoucherPdf(voucher: any) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 15;
  let y = margin;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // Helper functions
  const addText = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.4) + 2;
  };

  const addLine = () => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Title
  addText("HOTEL VOUCHER / BOOKING CONFIRMATION", 16, "bold", [0, 100, 200]);
  y += 3;
  addLine();

  // Hotel Name
  addText(voucher.hotelName, 14, "bold");
  if (voucher.hotelNameLocal) {
    addText(voucher.hotelNameLocal, 11, "normal", [100, 100, 100]);
  }
  y += 3;

  // Address
  addText("Address:", 10, "bold", [100, 100, 100]);
  addText(voucher.hotelAddress, 11);
  if (voucher.hotelAddressLocal) {
    addText(voucher.hotelAddressLocal, 10, "normal", [100, 100, 100]);
  }
  if (voucher.hotelPhone) {
    addText(`Tel: ${voucher.hotelPhone}`, 10);
  }
  y += 3;
  addLine();

  // Check-in / Check-out
  addText("CHECK-IN / CHECK-OUT", 12, "bold", [0, 100, 200]);
  y += 2;
  addText(`Check-in:  ${voucher.checkInDate || "-"}  ${voucher.checkInTime || "14:00"}`, 11);
  addText(`Check-out: ${voucher.checkOutDate || "-"}  ${voucher.checkOutTime || "12:00"}`, 11);
  y += 3;
  addLine();

  // Booking Details
  addText("BOOKING DETAILS", 12, "bold", [0, 100, 200]);
  y += 2;
  if (voucher.bookingId) addText(`Booking ID: ${voucher.bookingId}`, 11);
  if (voucher.guestName) addText(`Guest Name: ${voucher.guestName}`, 11);
  if (voucher.roomType) addText(`Room Type: ${voucher.roomType} x${voucher.roomCount || 1}`, 11);
  if (voucher.includes) addText(`Includes: ${voucher.includes}`, 11);
  y += 3;

  // Special Requests
  if (voucher.specialRequests) {
    addLine();
    addText("SPECIAL REQUESTS", 12, "bold", [0, 100, 200]);
    y += 2;
    addText(voucher.specialRequests, 10);
    y += 3;
  }

  // Cancellation Policy
  if (voucher.cancellationPolicy) {
    addLine();
    addText("CANCELLATION POLICY", 12, "bold", [200, 100, 0]);
    y += 2;
    addText(voucher.cancellationPolicy, 10, "normal", [100, 100, 100]);
    y += 3;
  }

  // Check-in Instructions
  if (voucher.checkInInstructions) {
    addLine();
    addText("CHECK-IN INSTRUCTIONS", 12, "bold", [0, 100, 200]);
    y += 2;
    addText(voucher.checkInInstructions, 10);
  }

  // Footer
  y = 280;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text("This is a computer-generated document. No signature is required.", margin, y);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y + 4);

  const fileName = `voucher-${voucher.hotelName?.replace(/\s+/g, "_") || "hotel"}-${voucher.checkInDate || "booking"}.pdf`;
  pdf.save(fileName);
}

/**
 * Generate a flight ticket PDF
 */
export async function downloadTicketPdf(ticket: any) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 15;
  let y = margin;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  const addText = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", style);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.4) + 2;
  };

  const addLine = () => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Title
  addText("E-TICKET / ITINERARY RECEIPT", 16, "bold", [0, 80, 180]);
  y += 3;
  addLine();

  // Passenger Info
  addText("PASSENGER INFORMATION", 12, "bold", [0, 80, 180]);
  y += 2;
  addText(`Passenger: ${ticket.passengerName}`, 11, "bold");
  if (ticket.bookingReference) addText(`Booking Reference: ${ticket.bookingReference}`, 11);
  if (ticket.ticketNumber) addText(`Ticket Number: ${ticket.ticketNumber}`, 11);
  y += 3;
  addLine();

  // Outbound Flight
  if (ticket.outboundFlightNo) {
    addText("OUTBOUND FLIGHT", 12, "bold", [0, 80, 180]);
    y += 2;
    addText(`${ticket.outboundAirline || ""} ${ticket.outboundFlightNo}`, 12, "bold");
    y += 2;
    addText(`From: ${ticket.outboundDepartureCode || ""} - ${ticket.outboundDepartureAirport || ""}`, 11);
    addText(`Date: ${ticket.outboundDepartureDate || ""}  Time: ${ticket.outboundDepartureTime || ""}`, 11);
    y += 2;
    addText(`To: ${ticket.outboundArrivalCode || ""} - ${ticket.outboundArrivalAirport || ""}`, 11);
    addText(`Date: ${ticket.outboundArrivalDate || ""}  Time: ${ticket.outboundArrivalTime || ""}`, 11);
    y += 3;
    addLine();
  }

  // Return Flight
  if (ticket.returnFlightNo) {
    addText("RETURN FLIGHT", 12, "bold", [0, 150, 80]);
    y += 2;
    addText(`${ticket.returnAirline || ""} ${ticket.returnFlightNo}`, 12, "bold");
    y += 2;
    addText(`From: ${ticket.returnDepartureCode || ""} - ${ticket.returnDepartureAirport || ""}`, 11);
    addText(`Date: ${ticket.returnDepartureDate || ""}  Time: ${ticket.returnDepartureTime || ""}`, 11);
    y += 2;
    addText(`To: ${ticket.returnArrivalCode || ""} - ${ticket.returnArrivalAirport || ""}`, 11);
    addText(`Date: ${ticket.returnArrivalDate || ""}  Time: ${ticket.returnArrivalTime || ""}`, 11);
    y += 3;
  }

  // Important Notice
  addLine();
  addText("IMPORTANT NOTICE", 10, "bold", [200, 100, 0]);
  y += 2;
  addText("• This is an electronic ticket. Please present this document along with a valid photo ID at the airport.", 9, "normal", [100, 100, 100]);
  addText("• Please arrive at the airport at least 2 hours before departure for international flights.", 9, "normal", [100, 100, 100]);
  addText("• Check-in counters close 45 minutes before departure.", 9, "normal", [100, 100, 100]);

  // Footer
  y = 280;
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text("This is a computer-generated document. No signature is required.", margin, y);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y + 4);

  const fileName = `eticket-${ticket.passengerName?.replace(/\s+/g, "_") || "ticket"}-${ticket.outboundDepartureDate || "flight"}.pdf`;
  pdf.save(fileName);
}
