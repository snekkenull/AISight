/**
 * Type declarations for @changey/react-leaflet-markercluster
 */

declare module '@changey/react-leaflet-markercluster' {
  import { ReactNode } from 'react';
  import { MarkerClusterGroupOptions } from 'leaflet';

  interface MarkerClusterGroupProps extends Partial<MarkerClusterGroupOptions> {
    children?: ReactNode;
  }

  const MarkerClusterGroup: React.FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}

// Keep old module declaration for backwards compatibility
declare module 'react-leaflet-markercluster' {
  import { ReactNode } from 'react';
  import { MarkerClusterGroupOptions } from 'leaflet';

  interface MarkerClusterGroupProps extends Partial<MarkerClusterGroupOptions> {
    children?: ReactNode;
  }

  const MarkerClusterGroup: React.FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}
