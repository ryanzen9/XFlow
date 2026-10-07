import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";

export function MetricGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <Grid columns={{ minWidth: 120, max: 4 }} gap={4}>
      {stats.map((stat) => (
        <Card key={stat.label} padding={4}>
          <VStack as="dl" gap={2}>
            <dt>
              <Text type="supporting" maxLines={2} className="min-h-8">
                {stat.label}
              </Text>
            </dt>
            <dd>
              <Text type="display-1" hasTabularNumbers maxLines={1}>
                {stat.value}
              </Text>
            </dd>
          </VStack>
        </Card>
      ))}
    </Grid>
  );
}
