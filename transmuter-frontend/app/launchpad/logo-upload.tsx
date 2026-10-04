"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { toastError } from "@/lib/toast";
import { useLaunchpad } from "./launchpad-context";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const IMAGE_EXT = /\.(png|jpe?g|svg|webp|gif)$/i;

export function LogoUpload() {
  const { state, dispatch } = useLaunchpad();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  function readLogo(file: File | undefined) {
    if (!file) return;
    const isImage = file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
    if (!isImage) {
      toastError("Use a PNG, JPG, or SVG.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toastError("Logo must be 2MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      dispatch({
        type: "SET_LOGO",
        url: ev.target?.result as string,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    dispatch({ type: "SET_LOGO", url: null, fileName: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    readLogo(e.dataTransfer.files[0]);
  }

  return (
    <div className="field">
      <label className="field-label">Token Logo</label>
      <div
        className={`logo-upload-zone${state.logoUrl ? " has-logo" : ""}${dragging ? " is-dragging" : ""}`}
        onDragEnter={onDragEnter}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button type="button" className="logo-upload-pick" onClick={() => inputRef.current?.click()}>
          {!state.logoUrl ? (
            <div className="logo-upload-inner">
              <div className="logo-upload-icon">⬆</div>
              <div className="logo-upload-text">
                {dragging ? "Drop logo here" : "Click or drag to upload logo"}
              </div>
              <div className="logo-upload-sub">
                PNG, JPG or SVG · Max 2MB · Recommended 256×256px
              </div>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-upload-preview" src={state.logoUrl} alt="" />
              <div className="logo-upload-meta">
                <span className="logo-upload-filename" title={state.logoFileName ?? undefined}>
                  {state.logoFileName}
                </span>
                <span className="logo-upload-change">
                  {dragging ? "Drop to replace" : "Click or drop to change"}
                </span>
              </div>
            </>
          )}
        </button>
        {state.logoUrl ? (
          <button type="button" className="logo-upload-remove" aria-label="Remove logo" onClick={clearLogo}>
            <X aria-hidden="true" size={18} strokeWidth={2.25} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          readLogo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
