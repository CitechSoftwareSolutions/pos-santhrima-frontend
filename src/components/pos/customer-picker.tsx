"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCustomers } from "@/lib/hooks/use-customers";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { CustomerDto } from "@/lib/types";

export function CustomerPicker({
  customerId,
  onChange,
}: {
  customerId: string | null;
  onChange: (customer: CustomerDto | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const customers = useCustomers({ search: debouncedSearch || undefined, page: 1, pageSize: 20 });
  const selected = customers.data?.items.find((c) => c.id === customerId);

  if (customerId && !selected) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        <span className="flex items-center gap-2 text-sm">
          <User className="size-4" /> Selected customer
        </span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal" />
        }
      >
        <span className="flex items-center gap-2 truncate text-sm">
          <User className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <span className="truncate">
              {selected.name}{" "}
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                ({selected.loyaltyPoints.toFixed(2)} pts)
              </span>
            </span>
          ) : (
            "Walk-in customer"
          )}
        </span>
        <span className="flex items-center gap-1">
          {selected && (
            <X
              className="size-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search customers..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn("size-4", !customerId ? "opacity-100" : "opacity-0")} />
                Walk-in customer
              </CommandItem>
              {customers.data?.items.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onChange(customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4", customerId === customer.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {customer.phone || "No phone"} ·{" "}
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {customer.loyaltyPoints.toFixed(2)} pts
                      </span>
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
