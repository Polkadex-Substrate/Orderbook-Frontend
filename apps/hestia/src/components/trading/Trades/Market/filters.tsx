import classNames from "classnames";
import React, { ChangeEvent } from "react";
import { Input } from "@mitra/ux";
import { RiStarLine } from "@remixicon/react";

export const Filters = ({
  onSearch,
  searchField,
  onChangeFavorite,
  activeFavorite,
}: {
  onSearch: (e: ChangeEvent<HTMLInputElement>) => void;
  searchField: string;
  onChangeFavorite: () => void;
  activeFavorite: boolean;
}) => {
  return (
    <div className="flex p-2 justify-between items-center pr-2 bg-level-1">
      <Input.Search
        placeholder="Search market.."
        value={searchField}
        onChange={onSearch}
        className="max-sm:focus:text-[16px]"
      />
      <button onClick={onChangeFavorite}>
        <RiStarLine
          className={classNames(
            activeFavorite ? "text-primary-base" : "text-primary-disabled",
            "w-4 h-4"
          )}
        />
      </button>
    </div>
  );
};
