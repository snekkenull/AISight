/**
 * Type declarations for @changey/react-leaflet-markercluster
 * Compatible with react-leaflet v4
 */

declare module '@changey/react-leaflet-markercluster' {
  import { ReactNode } from 'react';
  import { MarkerClusterGroupOptions } from 'leaflet';

  export interface MarkerClusterGroupProps extends Partial<MarkerClusterGroupOptions> {
    children?: ReactNode;
  }

  const MarkerClusterGroup: React.FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}
