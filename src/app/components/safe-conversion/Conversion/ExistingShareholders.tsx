import React from "react";
import CurrencyInput from "react-currency-input-field";
import { RowsProps } from "./PropTypes";
import { FaRegTrashCan } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuestionMarkTooltipComponent from "@/components/tooltip/QuestionMarkTooltip";
import { CommonCapTableRow } from "@library/cap-table/types";

export type ExistingShareholderProps = CommonCapTableRow & {
  // We need to ensure we can identify the row when updating or deleting
  id: string;
};

interface ExistingShareholderRowProps {
  data: ExistingShareholderProps;
  onDelete: (id: string) => void;
  onUpdate: (data: ExistingShareholderProps) => void;
  allowDelete?: boolean;
  disableNameEdit?: boolean;
}

const ExistingShareholderRow: React.FC<ExistingShareholderRowProps> = ({
  data,
  onDelete,
  onUpdate,
  allowDelete,
  disableNameEdit,
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

  const ownership = data.ownershipPct ?? 0;

  const getTooltipButton = () => {
    if (data.id === "UnusedOptionsPool") {
      return (
        <div className="inline-block text-muted-foreground">
          <QuestionMarkTooltipComponent>
            <div className="max-w-72">
              <p>
                Reserved shares that have yet to be assigned as option grants
                for team members.
              </p>
              <i>
                [For example, if you have an option plan with 150,000 reserved
                shares and then granted 50,000 options to team members, your
                Unissued Option pool would be 100,000.]
              </i>
            </div>
          </QuestionMarkTooltipComponent>
        </div>
      );
    } else if (data.id === "IssuedOptions") {
      return (
        <div className="inline-block text-muted-foreground">
          <QuestionMarkTooltipComponent>
            <div className="max-w-72">
              Options or shares already issued to other employees, advisors, or
              shareholders in the company.
            </div>
          </QuestionMarkTooltipComponent>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-full sm:max-w-[960px] mx-auto mb-4 p-3 bg-muted/50 rounded-md border border-border relative">
      {allowDelete && (
        <Button
          onClick={() => {
            onDelete(data.id);
          }}
          variant="ghost"
          className="p-0 text-red-400 hover:text-red-500 h-auto absolute top-3 right-1"
        >
          <FaRegTrashCan className="inline" width={20} />
        </Button>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
        <div className="mb-3 md:mb-0 md:flex-1">
          {disableNameEdit ? (
            <span className="ml-2 inline-block font-medium">
              {data.name} {getTooltipButton()}
            </span>
          ) : (
            <div>
              <div className="text-muted-foreground mb-1">Name</div>
              <Input
                type="text"
                name="name"
                autoComplete="off"
                value={data.name}
                onChange={handleInputChange}
                placeholder="Common Shareholder Name"
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-muted-foreground mb-1">Shares</div>
          <CurrencyInput
            type="text"
            name="shares"
            value={data.shares}
            onValueChange={onValueChange}
            placeholder="Shares"
            className="w-full"
            prefix=""
            decimalScale={0}
            allowDecimals={false}
            customInput={Input}
          />
        </div>

        <div className="mb-3 md:mb-0 md:flex-1">
          <div className="text-muted-foreground mb-1">
            Ownership %
          </div>
          <div className="px-3 py-2 bg-background border border-input rounded-md">
            {(ownership * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};

const ExisingShareholderList: React.FC<RowsProps<ExistingShareholderProps>> = ({
  rows,
  onDelete,
  onUpdate,
  onAddRow,
}) => {
  // Don't include the UnusedOptionsRow in the editable list since this is edited in a seperate field
  const existingShareholders = rows.filter(
    (row) => ["UnusedOptionsPool", "IssuedOptions"].indexOf(row.id) === -1
  );

  const issuedOptionsRow = rows.find((row) => row.id === "IssuedOptions");
  const unusedOptionsRow = rows.find((row) => row.id === "UnusedOptionsPool");

  return (
    <div className="w-full">
      {existingShareholders.map((shareholder, idx) => (
        <ExistingShareholderRow
          key={idx}
          data={shareholder}
          onUpdate={onUpdate}
          onDelete={onDelete}
          allowDelete={rows.length > 1}
        />
      ))}

      {issuedOptionsRow && (
        <ExistingShareholderRow
          data={issuedOptionsRow}
          onUpdate={onUpdate}
          onDelete={() => {}}
          allowDelete={false}
          disableNameEdit={true}
        />
      )}

      {unusedOptionsRow && (
        <ExistingShareholderRow
          data={unusedOptionsRow}
          onUpdate={onUpdate}
          onDelete={() => {}}
          allowDelete={false}
          disableNameEdit={true}
        />
      )}

      <div className="w-full max-w-full sm:max-w-[960px] mx-auto">
        <Button
          onClick={onAddRow}
          variant="default"
          className="w-full"
        >
          + Add another Shareholder
        </Button>
      </div>
    </div>
  );
};

export default ExisingShareholderList;
