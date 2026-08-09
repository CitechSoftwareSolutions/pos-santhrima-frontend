"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Truck } from "lucide-react";
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
import { useSuppliers } from "@/lib/hooks/use-suppliers";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import type { SupplierDto } from "@/lib/types";

export function SupplierCombobox({
  value,
  onSelect,
}: {
  value: SupplierDto | null;
  onSelect: (supplier: SupplierDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  const suppliers = useSuppliers({ search: debouncedSearch || undefined, page: 1, pageSize: 20 });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" className="w-full justify-between font-normal" />}
      >
        <span className="flex items-center gap-2 truncate text-sm">
          <Truck className="size-4 shrink-0 text-muted-foreground" />
          {value ? value.name : "Select a supplier..."}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search suppliers..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No suppliers found.</CommandEmpty>
            <CommandGroup>
              {suppliers.data?.items.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={supplier.id}
                  onSelect={() => {
                    onSelect(supplier);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4", value?.id === supplier.id ? "opacity-100" : "opacity-0")}
                  />
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
