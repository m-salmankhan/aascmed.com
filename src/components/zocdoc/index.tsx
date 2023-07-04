import React, {useEffect, useRef} from "react";

const ZocDocOriginal: React.FC = () => {
    const anchorRef = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        window.setTimeout(() => {
            if(anchorRef.current === null) return;
            const script = document.createElement('script');

            script.type = 'text/javascript';
            script.async = true;
            script.src = 'https://offsiteschedule.zocdoc.com/plugin/embed';

            anchorRef.current.append(script);

        }, 1000);
    })
    return (
        <div id="zocdoc">
            <a
                ref={anchorRef}
                href='https://www.zocdoc.com/practice/allergy-asthma-and-sinus-centers-3233'
                className='zd-plugin'
                data-type='book-button'
                data-practice-id='3233'
                title=' Allergy, Asthma & Sinus Centers'
            >
            </a>
        </div>
    )
}

export const ZocDoc = () => {
    return <ZocDocOriginal/>;
}