import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FileService, WorkspaceFile } from '../../../services/file.service';
import MarkdownIt from 'markdown-it';

interface FileIcon {
  [key: string]: string;
}

@Component({
  selector: 'app-file-editor',
  templateUrl: './file-editor.component.html',
  styleUrls: ['./file-editor.component.scss'],
})
export class FileEditorComponent implements OnInit {
  files: WorkspaceFile[] = [];
  selectedFile: WorkspaceFile | null = null;
  editorContent = '';
  originalContent = '';
  /** true = View mode (rendered markdown), false = Edit mode (raw text) */
  previewMode = true;
  loading = false;
  saving = false;
  saveSuccess = false;
  saveError = '';
  loadError = '';

  private md = new MarkdownIt({ html: false, linkify: true, typographer: true });

  readonly fileIcons: FileIcon = {
    'SOUL.md': '🧬',
    'IDENTITY.md': '🤖',
    'USER.md': '👤',
    'WORKFLOW.md': '🔀',
    'AGENTS.md': '📋',
    'TOOLS.md': '🔧',
    'HEARTBEAT.md': '💓',
    'MEMORY.md': '🧠',
  };

  readonly defaultIcon = '📄';

  constructor(
    private fileService: FileService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  async loadFiles(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      this.files = await this.fileService.listFiles();
    } catch (e: any) {
      this.loadError = e.message || 'Failed to load files';
    } finally {
      this.loading = false;
    }
  }

  async selectFile(file: WorkspaceFile): Promise<void> {
    if (this.selectedFile?.name === file.name) return;
    this.loading = true;
    this.loadError = '';
    this.saveSuccess = false;
    this.saveError = '';
    // Default to view mode on each new file selection
    this.previewMode = true;
    try {
      const result = await this.fileService.getFile(file.name);
      this.selectedFile = result;
      this.editorContent = result.content || '';
      this.originalContent = this.editorContent;
    } catch (e: any) {
      this.loadError = e.message || 'Failed to load file';
    } finally {
      this.loading = false;
    }
  }

  getIcon(filename: string): string {
    return this.fileIcons[filename] || this.defaultIcon;
  }

  get hasChanges(): boolean {
    return this.editorContent !== this.originalContent;
  }

  get lineCount(): number {
    return this.editorContent ? this.editorContent.split('\n').length : 0;
  }

  get renderedMarkdown(): SafeHtml {
    const html = this.md.render(this.editorContent || '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  togglePreview(): void {
    this.previewMode = !this.previewMode;
  }

  async save(): Promise<void> {
    if (!this.selectedFile || this.saving) return;
    this.saving = true;
    this.saveSuccess = false;
    this.saveError = '';
    try {
      await this.fileService.saveFile(this.selectedFile.name, this.editorContent);
      this.originalContent = this.editorContent;
      this.saveSuccess = true;
      setTimeout(() => (this.saveSuccess = false), 2000);
    } catch (e: any) {
      this.saveError = e.message || 'Failed to save';
    } finally {
      this.saving = false;
    }
  }

  revert(): void {
    this.editorContent = this.originalContent;
    this.saveError = '';
  }

  handleTab(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.editorContent =
        this.editorContent.substring(0, start) +
        '  ' +
        this.editorContent.substring(end);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }

  handleSaveShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      this.save();
    }
  }
}
