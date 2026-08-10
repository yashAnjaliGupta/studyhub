export interface Chapter {
  id: number;
  title: string;
}

export interface Highlight {
  text: string;
  page: number;
}

export type ChatRole = "ai" | "user";

export interface ChatMessage {
  from: ChatRole;
  text: string;
}

// Mirrors react-pdf's onLoadSuccess payload shape (subset we use).
export interface PdfLoadResult {
  numPages: number;
}

export interface PdfDocumentProps {
  fileUrl: string;
  pageNumber: number;
  zoom: number;
  onLoadSuccess: (result: PdfLoadResult) => void;
  scrollMode?: "vertical" | "horizontal";
  onPageChange?: (page: number) => void;
  numPages: number;
  scrollTarget?: { page: number; timestamp: number } | null;
}
