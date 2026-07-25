import { Typography, Dropdown, Pagination } from "@mitra/ux";
import classNames from "classnames";
import { forwardRef } from "react";

type Props = {
  totalResultCount?: number;
  page?: number;
  rowsPerPage?: number;
  onSetRowsPerPage?: (row: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  prevButtonDisabled?: boolean;
  nextButtonDisabled?: boolean;
};

export const TablePagination = forwardRef<HTMLDivElement, Props>(
  (
    {
      totalResultCount = 0,
      page,
      rowsPerPage = 10,
      onSetRowsPerPage,
      onPrevPage,
      onNextPage,
      prevButtonDisabled,
      nextButtonDisabled,
    },
    ref
  ) => {
    const rows = [10, 20, 30];
    return (
      <div
        ref={ref}
        className="bg-backgroundBase flex items-center justify-end gap-2 px-3 py-1 border-t border-primary flex-wrap"
      >
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            <Typography.Text>Rows per page</Typography.Text>
            <Dropdown>
              <Dropdown.Trigger className="border rounded-md border-secondary-base p-1">
                {rowsPerPage}
                <Dropdown.Icon />
              </Dropdown.Trigger>
              <Dropdown.Content>
                {rows.map((row, i) => (
                  <Dropdown.ItemCheckbox
                    key={i}
                    checked={row === rowsPerPage}
                    onSelect={() => onSetRowsPerPage?.(row)}
                  >
                    {row}
                  </Dropdown.ItemCheckbox>
                ))}
              </Dropdown.Content>
            </Dropdown>
          </div>
          <div>
            <Pagination>
              <Typography.Text className="text-sm">
                Page {page}
                {totalResultCount > 0 &&
                  ` of ${Math.ceil(totalResultCount / rowsPerPage)}`}
              </Typography.Text>
              <Pagination.Content>
                <div
                  onClick={onPrevPage}
                  className={classNames(
                    prevButtonDisabled && "pointer-events-none opacity-50"
                  )}
                >
                  <Pagination.Button arrowSide="left" />
                </div>
                <div
                  onClick={onNextPage}
                  className={classNames(
                    nextButtonDisabled && "pointer-events-none opacity-50"
                  )}
                >
                  <Pagination.Button arrowSide="right" />
                </div>
              </Pagination.Content>
            </Pagination>
          </div>
        </div>
      </div>
    );
  }
);

TablePagination.displayName = "TablePagination";
