"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

// 在瀏覽器端動態載入，避免 SSR 問題
const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-40 border rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
      載入編輯器中...
    </div>
  ),
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "請輸入商品描述...",
  height = 250,
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = [
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "list", "bullet",
    "align",
    "link",
  ];

  return (
    <div className="rich-editor-wrapper">
      <style>{`
        .rich-editor-wrapper .ql-container {
          min-height: ${height}px;
          font-size: 14px;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        .rich-editor-wrapper .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f9fafb;
        }
        .rich-editor-wrapper .ql-editor {
          min-height: ${height}px;
        }
        .rich-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
