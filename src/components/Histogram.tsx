import React, { useEffect, useMemo, useRef } from "react";
import { scaleLinear } from "d3-scale";
import { histogram } from "d3-array";
import { max as d3Max } from "d3-array";
import { select } from "d3-selection";
import { axisBottom } from "d3-axis";
import { axisLeft } from "d3-axis";

const MARGIN = { top: 40, right: 20, bottom: 50, left: 50 };
const BUCKET_PADDING = 1;

type HistogramProps = {
  width: number;
  height: number;
  data: number[];
  mean: number;
  min: number;
  max: number;
};

export const Histogram = ({
  width,
  height,
  data,
  mean,
  min,
  max,
}: HistogramProps) => {
  const axesRef = useRef(null);
  const boundsWidth = width - MARGIN.right - MARGIN.left;
  const boundsHeight = height - MARGIN.top - MARGIN.bottom;

  const lineValues = [
    { value: mean, label: "Mean: " + mean.toFixed(2) },
    { value: min, label: "Min: " + min.toFixed(2) },
    { value: max, label: "Max: " + max.toFixed(2) },
  ];

  const xScale = useMemo(() => {
    const max = Math.max(...data);
    return scaleLinear().domain([0, 0.4]).range([10, boundsWidth]);
  }, [data, width]);

  const buckets = useMemo(() => {
    const bucketGenerator = histogram()
      .value((d) => d)
      .domain([0, d3Max(data) as number])
      .thresholds([0.0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]);
    return bucketGenerator(data);
  }, [xScale]);

  const yScale = useMemo(() => {
    const max = Math.max(...buckets.map((bucket) => bucket?.length));
    return scaleLinear().range([boundsHeight, 0]).domain([0, max]).nice();
  }, [data, height]);

  // Render the X axis using d3.js, not react
  useEffect(() => {
    const svgElement = select(axesRef.current);
    svgElement.selectAll("*").remove();

    const xAxisGenerator = axisBottom(xScale);
    svgElement
      .append("g")
      .attr("transform", "translate(0," + boundsHeight + ")")
      .call(xAxisGenerator);

    const yAxisGenerator = axisLeft(yScale);
    svgElement.append("g").call(yAxisGenerator);

    // Add x-axis label
    svgElement
      .append("text")
      .attr("x", boundsWidth / 2)
      .attr("y", boundsHeight + 40)
      .text("Abundance of Juvenile Snapper, Grouper, and Parrotfish")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px");

    // Add y-axis label
    svgElement
      .append("text")
      .attr("x", -boundsHeight / 2)
      .attr("y", -35)
      .text("Count")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("transform", "rotate(-90)");

    // Add vertical lines with labels
    if (mean !== 0) {
      lineValues.forEach((line, index) => {
        if (index === 0) {
          svgElement
            .append("line")
            .attr("x1", xScale(line.value))
            .attr("y1", -25)
            .attr("x2", xScale(line.value))
            .attr("y2", boundsHeight)
            .attr("stroke", "black");

          svgElement
            .append("text")
            .attr("x", xScale(line.value))
            .attr("y", -30)
            .text(line.label)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px");
        } else if (index === 1) {
          svgElement
            .append("line")
            .attr("x1", xScale(line.value))
            .attr("y1", -10)
            .attr("x2", xScale(line.value))
            .attr("y2", boundsHeight)
            .attr("stroke", "black")
            .attr("stroke-dasharray", "2,2");

          svgElement
            .append("text")
            .attr("x", xScale(line.value) - 21)
            .attr("y", -15)
            .text(line.label)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px");
        } else if (index === 2) {
          svgElement
            .append("line")
            .attr("x1", xScale(line.value))
            .attr("y1", -10)
            .attr("x2", xScale(line.value))
            .attr("y2", boundsHeight)
            .attr("stroke", "black")
            .attr("stroke-dasharray", "2,2");

          svgElement
            .append("text")
            .attr("x", xScale(line.value) + 25)
            .attr("y", -15)
            .text(line.label)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px");
        }
      });
    } else {
      svgElement
        .append("line")
        .attr("x1", xScale(lineValues[0].value))
        .attr("y1", -15)
        .attr("x2", xScale(lineValues[0].value))
        .attr("y2", boundsHeight)
        .attr("stroke", "black");

      svgElement
        .append("text")
        .attr("x", xScale(lineValues[0].value))
        .attr("y", -20)
        .text(lineValues[0].label)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px");
    }
  }, [xScale, yScale, boundsHeight]);

  const allRects = buckets.map((bucket, i) => {
    if (bucket.x0 == undefined || bucket.x1 == undefined) {
      return null;
    }
    return (
      <rect
        key={i}
        fill="#ACD0DE"
        x={xScale(bucket.x0) + BUCKET_PADDING / 2}
        width={45}
        y={yScale(bucket.length)}
        height={boundsHeight - yScale(bucket.length)}
      />
    );
  });

  return (
    <svg width={width} height={height}>
      <g
        width={boundsWidth}
        height={boundsHeight}
        transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
      >
        {allRects}
      </g>
      <g
        width={boundsWidth}
        height={boundsHeight}
        ref={axesRef}
        transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
      />
    </svg>
  );
};
