export const locations = {
  Library: [12.873582943873872, 80.21921784197703],
  Canteen: [12.872502, 80.219496],
  AdminBlock: [12.873147339012304, 80.22180918077176],
  Block1: [12.87388781717391, 80.2214368051665],
  Block2: [12.87279953771407, 80.2208933391326],
  CentreForAdvancedStudies: [12.871388230107986, 80.22526689609808],
};

export const displayNames = {
  Library: 'Library',
  Canteen: 'Canteen',
  AdminBlock: 'Admin Block',
  Block1: 'Block 1',
  Block2: 'Block 2',
  CentreForAdvancedStudies: 'Centre for Advanced Studies',
  CurrentLocation: 'Current Location',
};

export type LocationKey = keyof typeof locations;
export type DisplayNameKey = keyof typeof displayNames; 