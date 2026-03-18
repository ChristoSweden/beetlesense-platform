import {
  calculateMachineSchedule,
  planExtractionPaths,
  compareMillOptions,
  calculateCostSummary,
  getSeasonRecommendation,
  generateHarvestPlan,
  getDemoStand,
  type StandInfo,
} from '../harvestLogisticsService';

const demoStand = getDemoStand();

describe('harvestLogisticsService', () => {
  describe('machine schedule covers full volume', () => {
    it('harvester processes full volume', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const harvester = schedule.blocks.find(b => b.machine === 'harvester')!;

      expect(harvester.volumeM3fub).toBe(demoStand.volumeM3fub);
    });

    it('forwarder processes full volume', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const forwarder = schedule.blocks.find(b => b.machine === 'forwarder')!;

      expect(forwarder.volumeM3fub).toBe(demoStand.volumeM3fub);
    });

    it('trucks combined cover full volume', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const trucks = schedule.blocks.filter(b => b.machine === 'truck');

      const truckVolume = trucks.reduce((s, t) => s + t.volumeM3fub, 0);
      expect(truckVolume).toBeGreaterThanOrEqual(demoStand.volumeM3fub);
    });

    it('schedule has positive total days', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');

      expect(schedule.totalDays).toBeGreaterThan(0);
      expect(schedule.totalMachineHours).toBeGreaterThan(0);
      expect(schedule.totalCostSEK).toBeGreaterThan(0);
    });

    it('forwarder starts after harvester', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const harvester = schedule.blocks.find(b => b.machine === 'harvester')!;
      const forwarder = schedule.blocks.find(b => b.machine === 'forwarder')!;

      expect(forwarder.startDay).toBeGreaterThan(harvester.startDay);
    });
  });

  describe('flat terrain has higher productivity than steep', () => {
    it('flat terrain finishes faster than steep for same volume', () => {
      const flatStand: StandInfo = { ...demoStand, terrainClass: 'flat_easy' };
      const steepStand: StandInfo = { ...demoStand, terrainClass: 'steep_wet' };

      const flatSchedule = calculateMachineSchedule(flatStand, 'winter');
      const steepSchedule = calculateMachineSchedule(steepStand, 'winter');

      expect(flatSchedule.totalDays).toBeLessThan(steepSchedule.totalDays);
    });

    it('flat terrain costs less than steep', () => {
      const flatStand: StandInfo = { ...demoStand, terrainClass: 'flat_easy' };
      const steepStand: StandInfo = { ...demoStand, terrainClass: 'steep_wet' };

      const flatSchedule = calculateMachineSchedule(flatStand, 'winter');
      const steepSchedule = calculateMachineSchedule(steepStand, 'winter');

      expect(flatSchedule.totalCostSEK).toBeLessThan(steepSchedule.totalCostSEK);
    });

    it('harvester hours are fewer on flat terrain', () => {
      const flatStand: StandInfo = { ...demoStand, terrainClass: 'flat_easy' };
      const steepStand: StandInfo = { ...demoStand, terrainClass: 'steep_wet' };

      const flatHarvester = calculateMachineSchedule(flatStand, 'winter')
        .blocks.find(b => b.machine === 'harvester')!;
      const steepHarvester = calculateMachineSchedule(steepStand, 'winter')
        .blocks.find(b => b.machine === 'harvester')!;

      expect(flatHarvester.activeHours).toBeLessThan(steepHarvester.activeHours);
    });
  });

  describe('mill comparison ranks by net revenue', () => {
    it('mills are sorted by net revenue descending', () => {
      const mills = compareMillOptions(demoStand);

      for (let i = 1; i < mills.length; i++) {
        expect(mills[i - 1].totalNetRevenue).toBeGreaterThanOrEqual(
          mills[i].totalNetRevenue,
        );
      }
    });

    it('exactly one mill is marked as best choice', () => {
      const mills = compareMillOptions(demoStand);
      const bestMills = mills.filter(m => m.isBestChoice);

      expect(bestMills).toHaveLength(1);
    });

    it('best choice has highest net revenue', () => {
      const mills = compareMillOptions(demoStand);
      const best = mills.find(m => m.isBestChoice)!;

      expect(best.totalNetRevenue).toBe(
        Math.max(...mills.map(m => m.totalNetRevenue)),
      );
    });

    it('transport cost per m3 increases with distance', () => {
      const mills = compareMillOptions(demoStand);
      // Sort by distance and check transport cost
      const sorted = [...mills].sort((a, b) => a.distanceKm - b.distanceKm);

      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].transportCostPerM3).toBeGreaterThanOrEqual(
          sorted[i - 1].transportCostPerM3,
        );
      }
    });
  });

  describe('cost summary revenue > costs for typical harvest', () => {
    it('produces positive net profit', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const mills = compareMillOptions(demoStand);
      const bestMill = mills.find(m => m.isBestChoice)!;
      const summary = calculateCostSummary(demoStand, schedule, bestMill);

      expect(summary.revenue.total).toBeGreaterThan(0);
      expect(summary.costs.total).toBeGreaterThan(0);
      expect(summary.netProfit).toBeGreaterThan(0);
      expect(summary.marginPercent).toBeGreaterThan(0);
    });

    it('revenue = sawlog + pulpwood + energyWood', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const mills = compareMillOptions(demoStand);
      const bestMill = mills.find(m => m.isBestChoice)!;
      const summary = calculateCostSummary(demoStand, schedule, bestMill);

      expect(summary.revenue.total).toBe(
        summary.revenue.sawlog + summary.revenue.pulpwood + summary.revenue.energyWood,
      );
    });

    it('costs = harvester + forwarder + transport + planning + roadMaintenance', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const mills = compareMillOptions(demoStand);
      const bestMill = mills.find(m => m.isBestChoice)!;
      const summary = calculateCostSummary(demoStand, schedule, bestMill);

      expect(summary.costs.total).toBe(
        summary.costs.harvester +
        summary.costs.forwarder +
        summary.costs.transport +
        summary.costs.planning +
        summary.costs.roadMaintenance,
      );
    });

    it('per-hectare and per-m3 metrics are reasonable', () => {
      const schedule = calculateMachineSchedule(demoStand, 'winter');
      const mills = compareMillOptions(demoStand);
      const bestMill = mills.find(m => m.isBestChoice)!;
      const summary = calculateCostSummary(demoStand, schedule, bestMill);

      expect(summary.perHectare).toBeGreaterThan(0);
      expect(summary.perM3).toBeGreaterThan(0);
    });
  });

  describe('extraction paths', () => {
    it('generates paths with basväg and stickväg types', () => {
      const plan = planExtractionPaths(demoStand);

      const basvägar = plan.paths.filter(p => p.type === 'basväg');
      const stickvägar = plan.paths.filter(p => p.type === 'stickväg');

      expect(basvägar.length).toBeGreaterThan(0);
      expect(stickvägar.length).toBeGreaterThan(0);
    });

    it('includes landings', () => {
      const plan = planExtractionPaths(demoStand);
      expect(plan.landings.length).toBeGreaterThan(0);
    });

    it('includes sensitive areas for stands with wetlands', () => {
      const plan = planExtractionPaths(demoStand);
      expect(plan.sensitiveAreas.length).toBeGreaterThan(0);
    });
  });

  describe('season recommendation', () => {
    it('returns 12 monthly ratings', () => {
      const rec = getSeasonRecommendation(demoStand);
      expect(rec.ratings).toHaveLength(12);
    });

    it('identifies optimal window', () => {
      const rec = getSeasonRecommendation(demoStand);
      expect(rec.optimalWindow.length).toBeGreaterThan(0);
      expect(rec.reasoning.length).toBeGreaterThan(0);
    });

    it('frozen ground months are in winter', () => {
      const rec = getSeasonRecommendation(demoStand);
      expect(rec.frozenGroundMonths).toContain('Jan');
      expect(rec.frozenGroundMonths).toContain('Feb');
    });
  });

  describe('full harvest plan', () => {
    it('generates a complete plan', () => {
      const plan = generateHarvestPlan(demoStand, 'winter');

      expect(plan.stand).toBeDefined();
      expect(plan.schedule).toBeDefined();
      expect(plan.extraction).toBeDefined();
      expect(plan.mills.length).toBeGreaterThan(0);
      expect(plan.costSummary).toBeDefined();
      expect(plan.seasonRecommendation).toBeDefined();
    });
  });
});
