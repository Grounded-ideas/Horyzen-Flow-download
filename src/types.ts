/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Page {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isManuallyEdited?: boolean;
  templateName?: string;
}

export interface AppState {
  pages: Page[];
  activePageId: string | null;
  isFocusMode: boolean;
}
