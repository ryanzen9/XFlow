import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VStack } from "@astryxdesign/core/VStack";
import { Search } from "lucide-react";
import { useI18n } from "../../ui/i18n";

export function CollectionFilters({
  id,
  query,
  onQueryChange,
  searchLabel,
  status,
  onStatusChange,
  options,
  count,
}: {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchLabel: string;
  status: string;
  onStatusChange: (status: string) => void;
  options: { value: string; label: string }[];
  count: number;
}) {
  const { locale, t } = useI18n();
  const resultCount = new Intl.NumberFormat(locale).format(count);
  return (
    <Toolbar
      className="-mx-3 my-0"
      label={searchLabel}
      size="sm"
      startContent={
        <HStack gap={3} wrap="wrap" width="100%">
          <VStack className="min-w-48 flex-1">
            <TextInput
              data-field={`${id}-search`}
              label={searchLabel}
              placeholder={searchLabel}
              isLabelHidden
              startIcon={Search}
              hasClear
              width="100%"
              value={query}
              onChange={onQueryChange}
            />
          </VStack>
          <VStack width={160}>
            <Selector
              label={t("collection.status")}
              isLabelHidden
              value={status}
              options={options}
              onChange={onStatusChange}
            />
          </VStack>
          <Badge
            role="status"
            label={resultCount}
            variant="neutral"
            aria-label={t("collection.results", { count: resultCount })}
            aria-live="polite"
            aria-atomic="true"
          />
        </HStack>
      }
    />
  );
}
