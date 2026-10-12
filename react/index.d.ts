import type { ReactNode, CSSProperties, ComponentType } from 'react';

export type El = Record<string, any> & { id: string; kind: string; children?: El[]; joined?: Record<string, El> };
export type LayoutRule = Record<string, any>;
export interface ScreenView {
  screen: string;
  state: string;
  type: string;
  elements: El[];
  layout: Record<string, LayoutRule>;
  [k: string]: any;
}
export interface Ctx {
  children(): ReactNode[];
  rule: LayoutRule | undefined;
  draw(el: El): ReactNode;
  drawList(els: El[]): ReactNode[];
  control(): ReactNode;
  text(v: unknown): string;
  list(v: unknown): unknown[];
  space: Record<string, number>;
  boxStyle(rule?: LayoutRule): CSSProperties;
  shell: boolean;
  view: ScreenView;
  layout: Record<string, LayoutRule>;
  unmapped: Set<string>;
  flatButtons(el: El): El[];
  chipOf(el: El): { label: string; picked: string[] };
}
export type Registry = Record<string, (el: El, ctx: Ctx) => ReactNode>;
export interface Join {
  kind: string;
  next: string | { kind: string; id?: string };
  as?: string;
  when?(el: El, next: El): boolean;
}
export interface Drawn {
  node: ReactNode;
  unmapped: Set<string>;
  shell: boolean;
  modal: El | null;
  roots: El[];
  rootRule: LayoutRule | undefined;
}
export interface CoreConfig {
  registry: Registry;
  joins?: Join[];
  space?: Record<string, number>;
  onSelect?: ((id: string, ev: any) => void) | null;
}
export interface HarnessConfig extends CoreConfig {
  api?: string;
  shell?(view: ScreenView, body: ReactNode, drawn: Drawn): ReactNode;
  bare?(view: ScreenView, body: ReactNode, drawn: Drawn): ReactNode;
  modal?(view: ScreenView, body: ReactNode, modalEl: El, drawn: Drawn): ReactNode;
  loading?(): ReactNode;
  failed?(error: string): ReactNode;
}
export function drawScreen(view: ScreenView, config: CoreConfig): Drawn;
export function findId(els: El[], id: string): El | undefined;
export function flatButtons(el: El): El[];
export function boxStyle(rule: LayoutRule | undefined, space?: Record<string, number>): CSSProperties;
export function chipOf(el: El): { label: string; picked: string[] };
export function text(v: unknown): string;
export function list(v: unknown): unknown[];
export function bridged(): boolean;
export function useScreen(args: { screen: string; state: string; api: string }): { view: ScreenView | null; error: string | null };
export function useBridge(view: ScreenView | null): void;
export function postSelect(id: string): void;
export function createHarness(config: HarnessConfig): ComponentType<{ screen: string; state?: string; api?: string }>;
