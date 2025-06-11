import React from "react";
import CurrencyInput from "react-currency-input-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowsProps } from "./PropTypes";
import { FaRegTrashCan } from "react-icons/fa6";
import { SeriesCapTableRow } from "@library/cap-table/types";

export type SeriesProps = SeriesCapTableRow & {
  id: string;
  name: string;
  investment: number;
  allowDelete?: boolean;
};

interface SeriesRowProps {
  data: SeriesProps;
  onDelete: (id: string) => void;
  onUpdate: (data: SeriesProps) => void;
  allowDelete?: boolean;
}

const SeriesInvestorRow: React.FC<SeriesRowProps> = ({
  data,
  onDelete,
  onUpdate,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    onUpdate({ ...data, [name]: value });
  };
  const onValueChange = (
    value: string | undefined,
    name: string | undefined
  ) => {
    if (name) {
      onUpdate({ ...data, [name]: parseFloat(value ?? "0") });
    }
  };

  return (
    <div
      className={`w-full relative max-w-full sm:max-w-[960px] mx-auto mb-4 p-4 bg-muted/50 rounded-md border border-border`}
    >
      <Button
        onClick={() => onDelete(data.id)}
        disabled={!data.allowDelete}
        variant="ghost"
        className={`p-0 h-auto absolute top-3 right-1 ${
          data.allowDelete
            ? "text-destructive hover:text-destructive/80"
            : "text-muted-foreground cursor-not-allowed"
        }`}
      >
        <FaRegTrashCan className="inline" width={20} />
      </Button>

      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-muted-foreground mb-1">Name</div>
          <Input
            type="text"
            name="name"
            autoComplete="off"
            value={data.name}
            onChange={handleInputChange}
            placeholder="Series Investor Name"
            className="w-full"
          />
        </div>
        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-muted-foreground mb-1">
            Investment
          </div>
          <CurrencyInput
            type="text"
            name="investment"
            value={data.investment}
            onValueChange={onValueChange}
            placeholder="Investment"
            autoComplete="off"
            className="w-full"
            prefix="$"
            decimalScale={0}
            customInput={Input}
          />
        </div>

        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-muted-foreground mb-1">
            Ownership %
          </div>
          <div className="px-3 py-2 bg-background border border-input rounded-md">
            {data.ownershipPct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const SeriesInvestorList: React.FC<RowsProps<SeriesProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
}) => {
  return (
    <div className="w-full">
      {rows.map((note, idx) => (
        <SeriesInvestorRow
          key={idx}
          data={note}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}

      <div className="w-full max-w-full sm:max-w-[960px] mx-auto">
        <Button
          onClick={onAddRow}
          variant="default"
          className="w-full"
        >
          + Add another Series Investor
        </Button>
      </div>
    </div>
  );
};

export default SeriesInvestorList;
