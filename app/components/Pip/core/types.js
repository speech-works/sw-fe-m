// Shapes of the core data. No DOM types, no platform types.
                                                           

                                                                               
                                                                                                          
                                                                    

/** One drawn path of a hand. Colours are roles, not hex values. */
                          
            
                    
                      
                       
                    
 
/** One hand drawing, in its own art units (w x h). wrists: [x share, y share, direction in degrees]. */
                                                                                                     

/** One layer of the static avatar (SVG markup from the kit), and how it moves. */
                                                                                                                                            // part: the kit part id (e.g. beard.full: the blush is drawn under the beard, as in the studio). clip: a STATIC cut (path d, kit units) inside the moving group: the hair drawn again over the lower ends of a hat band (kit hair:over)
/** One hair element (a hair layer is listed element by element: core moves its points). k = place in the plan. */
                                                                                                                                                
/** The open eyes (kit elements, as SVG text) and their numbers for the lids. */
                                                                                                                                                                                                   

/** One part of the avatar that the arm contact shadow falls on: shapes (kit units, fill only) that are moved by the group `cls` (body, collar or rig = the head), and the shadow colour. role: skin | shirt | hair. */
                                                                                                                           
/** pm.js SHD: the shadow is the hand drawing (all one colour), moved dx right (toward the body) and dy down, at `opacity`, cut to each region. */
                                                                                               

/** The look: colours, the kit layers of this avatar, and the shirt path that gives the shoulder line. */
                       
                                                                                                                                                                              
                                                                                                                                        
                                                                                   
                                                             
                                                                                                    
                                                                                                       
                                                                                                                                 
                                                                                                                                 
                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                   
                                                                                                                     
                                                                                                     
                                                                                                                                                   
                                                                                                                                              
                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                  
                                                                                                                                                                  
 

/** Colours of the moving parts, made from the look. */
                                                                                                                                                                 

                                                                                                 

/** One hand and its arm, in stage units (1000 x 1000, badge circle r 500 at 500,500). */
                            
              
                
                                                                      
                                                                    
                                                                     
                                                                   
                                                                                               
                                                                                      
                                                                                                      
                                                                                    
                                                                                              
                                                                                             
                                                                                                       
                                                                                                  
                                                                                                                                                                                                       
 

/** The eyes for one frame (live.js drawEyes). on = false when the eyes are fully shut (only the lash line shows). cutD = clip path of the open part. */
                                                                                                                                                     
/** The hair for one frame: the springs' numbers (see hair.ts). ver changes only when the hair moved enough to be written again. */
                                                                                         

/** Everything a drawer needs for one frame. Plain numbers and strings. */
                             
                                                                         
                                                                                                    
                                                                      
                 
                                                                                       
                                                        
                                                                                            
                                                                                                        
                                                      
                                                                                           
                                                                                                                  
                                                                                                      
                                                                                                
                                                                                                                            
                                                                                                                            
                                                     
                                                                             
                                                                          
                     
                                                                                                                                                                                                              
 
