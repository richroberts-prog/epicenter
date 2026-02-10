// Types

// Content doc pool
export {
	createContentDocPool,
	documentHandleToString,
	openDocument,
} from './content-doc-pool.js';
export type { ExtensionCategory } from './convert-on-switch.js';
// Convert-on-switch
export {
	convertContentType,
	getExtensionCategory,
	healContentType,
} from './convert-on-switch.js';
// Runtime indexes
export { createFileSystemIndex } from './file-system-index.js';
// File table definition
export { filesTable } from './file-table.js';
// Markdown helpers
export {
	markdownSchema,
	parseFrontmatter,
	serializeMarkdownWithFrontmatter,
	serializeXmlFragmentToMarkdown,
	updateYMapFromRecord,
	updateYXmlFragmentFromString,
	yMapToRecord,
} from './markdown-helpers.js';
export type {
	ContentDocPool,
	DocumentHandle,
	FileRow,
	FileSystemIndex,
	RichTextDocumentHandle,
	TextDocumentHandle,
} from './types.js';
export { ROOT_ID } from './types.js';
// Validation
export {
	assertUniqueName,
	disambiguateNames,
	fsError,
	validateName,
} from './validation.js';

// IFileSystem implementation
export { YjsFileSystem } from './yjs-file-system.js';
