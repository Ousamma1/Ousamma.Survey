/**
 * Statistical Calculations Utility
 * Provides methods for calculating various statistical measures
 */
class Statistics {
  /**
   * Calculate mean (average)
   */
  static mean(values) {
    if (!values || values.length === 0) return null;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate median
   */
  static median(values) {
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate mode (most frequent value)
   */
  static mode(values) {
    if (!values || values.length === 0) return null;

    const frequency = {};
    let maxFreq = 0;
    let modes = [];

    for (const value of values) {
      frequency[value] = (frequency[value] || 0) + 1;
      if (frequency[value] > maxFreq) {
        maxFreq = frequency[value];
        modes = [value];
      } else if (frequency[value] === maxFreq && !modes.includes(value)) {
        modes.push(value);
      }
    }

    return modes.length === values.length ? null : (modes.length === 1 ? modes[0] : modes);
  }

  /**
   * Calculate variance
   */
  static variance(values) {
    if (!values || values.length === 0) return null;
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return this.mean(squaredDiffs);
  }

  /**
   * Calculate standard deviation
   */
  static standardDeviation(values) {
    const variance = this.variance(values);
    return variance !== null ? Math.sqrt(variance) : null;
  }

  /**
   * Calculate percentile
   */
  static percentile(values, percentile) {
    if (!values || values.length === 0) return null;
    if (percentile < 0 || percentile > 100) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Calculate all percentiles at once
   */
  static percentiles(values) {
    return {
      p25: this.percentile(values, 25),
      p50: this.percentile(values, 50),
      p75: this.percentile(values, 75),
      p90: this.percentile(values, 90),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99)
    };
  }

  /**
   * Calculate min value
   */
  static min(values) {
    if (!values || values.length === 0) return null;
    return Math.min(...values);
  }

  /**
   * Calculate max value
   */
  static max(values) {
    if (!values || values.length === 0) return null;
    return Math.max(...values);
  }

  /**
   * Calculate range
   */
  static range(values) {
    const min = this.min(values);
    const max = this.max(values);
    return min !== null && max !== null ? max - min : null;
  }

  /**
   * Calculate correlation coefficient between two arrays
   */
  static correlation(x, y) {
    if (!x || !y || x.length !== y.length || x.length === 0) return null;

    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);

    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      sumXSquared += diffX * diffX;
      sumYSquared += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);
    return denominator !== 0 ? numerator / denominator : null;
  }

  /**
   * Calculate chi-square test statistic
   */
  static chiSquare(observed, expected) {
    if (!observed || !expected || observed.length !== expected.length) return null;

    let chiSquare = 0;
    for (let i = 0; i < observed.length; i++) {
      if (expected[i] === 0) continue;
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }

    return chiSquare;
  }

  /**
   * Calculate t-test statistic (independent samples)
   */
  static tTest(sample1, sample2) {
    if (!sample1 || !sample2 || sample1.length === 0 || sample2.length === 0) return null;

    const mean1 = this.mean(sample1);
    const mean2 = this.mean(sample2);
    const var1 = this.variance(sample1);
    const var2 = this.variance(sample2);
    const n1 = sample1.length;
    const n2 = sample2.length;

    const pooledVariance = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const standardError = Math.sqrt(pooledVariance * (1/n1 + 1/n2));

    return (mean1 - mean2) / standardError;
  }

  /**
   * Calculate coefficient of variation
   */
  static coefficientOfVariation(values) {
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    return mean !== 0 && mean !== null && stdDev !== null ? (stdDev / mean) * 100 : null;
  }

  /**
   * Calculate skewness
   */
  static skewness(values) {
    if (!values || values.length < 3) return null;

    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    const n = values.length;

    if (stdDev === 0) return null;

    let sum = 0;
    for (const value of values) {
      sum += Math.pow((value - mean) / stdDev, 3);
    }

    return (n / ((n - 1) * (n - 2))) * sum;
  }

  /**
   * Calculate kurtosis
   */
  static kurtosis(values) {
    if (!values || values.length < 4) return null;

    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    const n = values.length;

    if (stdDev === 0) return null;

    let sum = 0;
    for (const value of values) {
      sum += Math.pow((value - mean) / stdDev, 4);
    }

    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  /**
   * Calculate comprehensive statistics for a dataset
   */
  static comprehensiveStats(values) {
    if (!values || values.length === 0) return null;

    return {
      count: values.length,
      mean: this.mean(values),
      median: this.median(values),
      mode: this.mode(values),
      stdDev: this.standardDeviation(values),
      variance: this.variance(values),
      min: this.min(values),
      max: this.max(values),
      range: this.range(values),
      percentiles: this.percentiles(values),
      coefficientOfVariation: this.coefficientOfVariation(values),
      skewness: this.skewness(values),
      kurtosis: this.kurtosis(values)
    };
  }

  /**
   * Calculate distribution from values
   */
  static distribution(values) {
    if (!values || values.length === 0) return {};

    const dist = {};
    for (const value of values) {
      const key = String(value);
      dist[key] = (dist[key] || 0) + 1;
    }
    return dist;
  }

  /**
   * Calculate percentage distribution
   */
  static percentageDistribution(values) {
    if (!values || values.length === 0) return {};

    const dist = this.distribution(values);
    const total = values.length;
    const percentDist = {};

    for (const [key, count] of Object.entries(dist)) {
      percentDist[key] = {
        count,
        percentage: (count / total) * 100
      };
    }

    return percentDist;
  }
}

module.exports = Statistics;
