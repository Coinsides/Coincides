/** One bounded source strip on the first text fragment. Includes scroll chrome. */
export const PAGINATED_SOURCE_REFERENCE_GAP_PX = 10;
export const PAGINATED_SOURCE_REFERENCE_CHIP_HEIGHT_PX = 28;
export const PAGINATED_SOURCE_REFERENCE_ACTION_HEIGHT_PX = 22;
export const PAGINATED_SOURCE_REFERENCE_STRIP_HEIGHT_PX = PAGINATED_SOURCE_REFERENCE_CHIP_HEIGHT_PX + 18;
export const PAGINATED_SOURCE_REFERENCE_HEIGHT_PX = PAGINATED_SOURCE_REFERENCE_GAP_PX + PAGINATED_SOURCE_REFERENCE_STRIP_HEIGHT_PX;

export function pageFlowSourceReferenceHeight(sourceCount: number): number {
  return sourceCount > 0 ? PAGINATED_SOURCE_REFERENCE_HEIGHT_PX : 0;
}
