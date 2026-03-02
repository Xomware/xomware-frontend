import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'markdownPreview' })
export class MarkdownPreviewPipe implements PipeTransform {
  transform(value: string, maxLength: number = 200): string {
    if (!value) return '';

    let text = value
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
      // Remove strikethrough
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Collapse whitespace
      .replace(/\n{2,}/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '…';
    }

    return text;
  }
}
