import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useEditorStore } from "../stores/editor-store";
import { useAppStore } from "../stores/app-store";
import { addDocument } from "../stores/search-store";

function fileNameFromPath(path: string): string {
  const name = path.split(/[/\\]/).pop() || path;
  return name.replace(/\.md$/i, "");
}

/**
 * Open an .md file from disk and load it into the editor.
 */
export async function openFileFromDisk(): Promise<void> {
  const selected = await openDialog({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });

  if (!selected || typeof selected !== "string") return;

  try {
    const content = await readTextFile(selected);
    const name = fileNameFromPath(selected);
    useEditorStore.getState().setFile({
      filePath: selected,
      fileName: name,
      content,
    });
    useAppStore.getState().addRecentFile(selected);
    addDocument({
      id: selected,
      title: name,
      content,
      tags: "",
      slug: "",
    });
  } catch (err) {
    console.error("Failed to open file:", err);
    alert(
      `Couldn't open that file.\n\n${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Save the current buffer back to its file path, or prompt Save As if none.
 */
export async function saveFileToDisk(): Promise<void> {
  const { filePath, content, fileName, markSaved } = useEditorStore.getState();

  let targetPath = filePath;
  if (!targetPath) {
    const picked = await saveDialog({
      defaultPath: `${fileName || "Untitled"}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!picked) return;
    targetPath = picked;
  }

  try {
    await writeTextFile(targetPath, content);
    useEditorStore.getState().setFile({
      filePath: targetPath,
      fileName: fileNameFromPath(targetPath),
      content,
    });
    markSaved();
    useAppStore.getState().addRecentFile(targetPath);
  } catch (err) {
    console.error("Failed to save file:", err);
    alert(
      `Couldn't save that file.\n\n${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Save the current buffer to a new path.
 */
export async function saveFileAs(): Promise<void> {
  const { content, fileName } = useEditorStore.getState();
  const picked = await saveDialog({
    defaultPath: `${fileName || "Untitled"}.md`,
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!picked) return;

  try {
    await writeTextFile(picked, content);
    useEditorStore.getState().setFile({
      filePath: picked,
      fileName: fileNameFromPath(picked),
      content,
    });
    useEditorStore.getState().markSaved();
    useAppStore.getState().addRecentFile(picked);
  } catch (err) {
    console.error("Failed to save file:", err);
    alert(
      `Couldn't save that file.\n\n${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Create a new .md file on disk via a save dialog, then load it into the editor.
 */
export async function createNewFile(
  templateContent?: string
): Promise<void> {
  const defaultContent =
    templateContent !== undefined ? templateContent : "# Untitled\n\n";

  const picked = await saveDialog({
    defaultPath: "Untitled.md",
    filters: [{ name: "Markdown", extensions: ["md"] }],
  });
  if (!picked) return;

  try {
    await writeTextFile(picked, defaultContent);
    const name = fileNameFromPath(picked);
    useEditorStore.getState().setFile({
      filePath: picked,
      fileName: name,
      content: defaultContent,
    });
    useEditorStore.getState().markSaved();
    useAppStore.getState().addRecentFile(picked);
  } catch (err) {
    console.error("Failed to create new file:", err);
    alert(
      `Couldn't create that file.\n\n${err instanceof Error ? err.message : String(err)}`
    );
  }
}

const RFC_TEMPLATE = `# Title

## Overview

## Details

## Open Questions
`;

/**
 * Create a new .md file on disk pre-filled with the RFC template.
 */
export async function createNewFileFromTemplate(): Promise<void> {
  return createNewFile(RFC_TEMPLATE);
}

/**
 * Open a previously-recent file by its stored path.
 */
export async function openRecentFile(path: string): Promise<void> {
  try {
    const content = await readTextFile(path);
    const name = fileNameFromPath(path);
    useEditorStore.getState().setFile({
      filePath: path,
      fileName: name,
      content,
    });
    useAppStore.getState().addRecentFile(path);
    addDocument({
      id: path,
      title: name,
      content,
      tags: "",
      slug: "",
    });
  } catch (err) {
    console.error("Failed to open recent file:", err);
    useAppStore.getState().removeRecentFile(path);
  }
}
