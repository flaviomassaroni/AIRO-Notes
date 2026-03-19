#pragma once

#include <Eigen/Core>
#include <iostream>
#include <vector>

#include "rp_commons/grid.h"

/**
 * @brief Computes the gradients of the distance map for both rows and columns.
 *
 * @param metric_dmap Input metric distance map
 * @param drows Output gradient of the distance map for rows
 * @param dcols Output gradient of the distance map for columns
 */
inline void computeGradients(const Grid_<float>& metric_dmap,
                             Grid_<float>& drows, Grid_<float>& dcols) {
  // Resize the output gradients
  // TODO: resize the row gradient
  drows.resize(metric_dmap.rows(), metric_dmap.cols());
  // TODO: resize the column gradient
  dcols.resize(metric_dmap.rows(), metric_dmap.cols());
  
  for (unsigned int row = 1; row < metric_dmap.rows() - 1; ++row) {
    for (unsigned int col = 1; col < metric_dmap.cols() - 1; ++col) {
      // Compute the row gradient
      // drows.at(row, col) = // TODO;
      drows.at(row, col) = (metric_dmap.at(row+1, col) - metric_dmap.at(row-1, col)) * 0.5f;
      // Compute the column gradient
      // dcols.at(row, col) = // TODO;
      dcols.at(row, col) = (metric_dmap.at(row, col+1) - metric_dmap.at(row, col-1)) * 0.5f;
    }
  }
}

/**
 * @brief Computes the magnitudes of the gradients of the distance map.
 *
 * @param drows Gradient of the distance map for rows
 * @param dcols Gradient of the distance map for columns
 * @param magnitudes Output magnitudes of the gradients
 */
inline void computeMagnitudes(const Grid_<float>& drows,
                              const Grid_<float>& dcols,
                              Grid_<float>& magnitudes) {
  magnitudes.resize(drows.rows(), drows.cols());
  for (unsigned int row = 1; row < drows.rows() - 1; ++row) {
    for (unsigned int col = 1; col < drows.cols() - 1; ++col) {
      // Compute the squared norm of the gradient
      // magnitudes.at(row, col) = // TODO;
    
      float dx = drows.at(row, col);
      float dy = dcols.at(row, col);

      magnitudes.at(row, col) = std::sqrt(dx*dx + dy*dy);

    }
  }
}